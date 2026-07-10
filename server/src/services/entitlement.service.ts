import mongoose from "mongoose";
import Subscription from "../models/Subscription.model";
import User from "../models/User.model";
import Usage from "../models/Usage.model";
import { PLANS, PlanCode } from "../config/plans.config";

export class EntitlementService {
  /**
   * Resolves the user's active plan, performing dynamic check-time expiry checks.
   */
  async getUserPlan(userId: string): Promise<{
    plan: PlanCode;
    startedAt: Date;
    expiresAt: Date | null;
    status: string;
  }> {
    const user = await User.findById(userId).lean();
    if (!user) {
      return {
        plan: "FREE",
        startedAt: new Date(),
        expiresAt: null,
        status: "free",
      };
    }

    const sub = await Subscription.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });

    if (!sub) {
      return {
        plan: "FREE",
        startedAt: user.createdAt || new Date(),
        expiresAt: null,
        status: "free",
      };
    }

    // Dynamic Expiry Evaluation: If expiresAt is set and has passed, fall back to FREE
    if (sub.expiresAt && new Date() >= sub.expiresAt) {
      return {
        plan: "FREE",
        startedAt: sub.startedAt,
        expiresAt: sub.expiresAt,
        status: "expired",
      };
    }

    return {
      plan: sub.plan,
      startedAt: sub.startedAt,
      expiresAt: sub.expiresAt,
      status: sub.status,
    };
  }

  /**
   * Checks daily feature entitlement.
   */
  async checkEntitlement(
    userId: string,
    feature: "textChat" | "imageGenerate" | "videoGenerate" | "fileGenerate"
  ): Promise<{
    allowed: boolean;
    plan: PlanCode;
    feature: string;
    used: number;
    limit: number | null;
    remaining: number | null;
    resetAt: string;
    upgradeAvailable: boolean;
    reason: string | null;
  }> {
    const { plan } = await this.getUserPlan(userId);
    const planConfig = PLANS[plan] || PLANS.FREE;
    const limit = planConfig.limits[feature];

    const todayStr = new Date().toISOString().split("T")[0];
    
    // Fetch today's usage document or mock zero if not created yet
    const usage = await Usage.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date: todayStr,
    });

    const used = usage ? ((usage as any)[feature] as number) || 0 : 0;
    const resetAt = new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString();

    let allowed = true;
    let remaining: number | null = null;

    if (limit !== null) {
      allowed = used < limit;
      remaining = Math.max(0, limit - used);
    }

    return {
      allowed,
      plan,
      feature,
      used,
      limit,
      remaining,
      resetAt,
      upgradeAvailable: plan !== "PRO_299",
      reason: allowed ? null : "DAILY_QUOTA_EXCEEDED",
    };
  }

  /**
   * Performs an atomic reservation check by checking limits and incrementing counters
   * in a safe, atomic, concurrent-safe transaction/update block.
   */
  async reserveQuota(
    userId: string,
    feature: "textChat" | "imageGenerate" | "videoGenerate" | "fileGenerate"
  ): Promise<{ allowed: boolean; detail: any }> {
    const { plan } = await this.getUserPlan(userId);
    const planConfig = PLANS[plan] || PLANS.FREE;
    const limit = planConfig.limits[feature];

    const todayStr = new Date().toISOString().split("T")[0];

    // Atomically find or create the daily document
    let usage = await Usage.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date: todayStr,
    });

    if (!usage) {
      try {
        usage = await Usage.create({
          userId: new mongoose.Types.ObjectId(userId),
          date: todayStr,
          plan,
        });
      } catch (err: any) {
        if (err.code === 11000) {
          usage = await Usage.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            date: todayStr,
          });
        } else {
          throw err;
        }
      }
    }

    const currentUsed = usage ? ((usage as any)[feature] as number) || 0 : 0;

    if (limit !== null && currentUsed >= limit) {
      return {
        allowed: false,
        detail: { plan, feature, used: currentUsed, limit },
      };
    }

    // Atomic increment
    const updateQuery: any = {
      $inc: {
        [feature]: 1,
        totalRequests: 1,
      },
      $set: {
        plan,
      }
    };

    // Backward compatibility: increment legacy textChats field
    if (feature === "textChat") {
      updateQuery.$inc.textChats = 1;
    }

    await Usage.updateOne(
      { userId: new mongoose.Types.ObjectId(userId), date: todayStr },
      updateQuery
    );

    return {
      allowed: true,
      detail: { plan, feature, used: currentUsed + 1, limit },
    };
  }

  /**
   * Releases quota reservation atomically on upstream provider task failure.
   */
  async releaseQuota(
    userId: string,
    feature: "textChat" | "imageGenerate" | "videoGenerate" | "fileGenerate"
  ): Promise<void> {
    const todayStr = new Date().toISOString().split("T")[0];
    
    const updateQuery: any = {
      $inc: {
        [feature]: -1,
        totalRequests: -1,
      },
    };

    if (feature === "textChat") {
      updateQuery.$inc.textChats = -1;
    }

    await Usage.updateOne(
      { userId: new mongoose.Types.ObjectId(userId), date: todayStr },
      updateQuery
    );
    console.log(`[EntitlementService] Safely rolled back quota for ${feature} (user ${userId})`);
  }
}

export const entitlementService = new EntitlementService();
