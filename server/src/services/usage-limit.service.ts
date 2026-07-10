import mongoose from "mongoose";
import UsageLimit, { IUsageLimit } from "../models/UsageLimit.model";
import User from "../models/User.model";
import { auditService } from "./audit.service";

// Usage category type
export type UsageCategory =
  | "imageGeneration"
  | "imageEditing"
  | "visionAnalysis"
  | "fileUploadAnalysis";

// Quota limits per subscription tier
const TIER_LIMITS: Record<string, Record<UsageCategory, number>> = {
  free: {
    imageGeneration: 3,
    imageEditing: 3,
    visionAnalysis: 3,
    fileUploadAnalysis: 3,
  },
  pro: {
    imageGeneration: 50,
    imageEditing: 50,
    visionAnalysis: 50,
    fileUploadAnalysis: 50,
  },
};

function todayUTC(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export class UsageLimitService {
  /**
   * Returns today's usage document for a user (upsert pattern).
   * Automatically sets the correct limits based on the user's subscription tier.
   */
  async getTodayUsage(userId: string): Promise<IUsageLimit> {
    const date = todayUTC();
    const user = await User.findById(userId).select("subscription").lean();
    const tier = (user?.subscription as string) || "free";
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    // Upsert: find or create the usage doc for today
    const usage = await UsageLimit.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), date },
      {
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(userId),
          date,
          imageGeneration: 0,
          imageEditing: 0,
          visionAnalysis: 0,
          fileUploadAnalysis: 0,
          maxImageGeneration: limits.imageGeneration,
          maxImageEditing: limits.imageEditing,
          maxVisionAnalysis: limits.visionAnalysis,
          maxFileUploadAnalysis: limits.fileUploadAnalysis,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return usage!;
  }

  /**
   * Check whether the user is within the quota for a given category.
   * Returns { allowed: true } or { allowed: false, limit, used, resetAt }
   */
  async checkUsage(
    userId: string,
    category: UsageCategory
  ): Promise<{ allowed: boolean; limit: number; used: number; resetAt: string }> {
    const usage = await this.getTodayUsage(userId);
    const maxKey = `max${category.charAt(0).toUpperCase() + category.slice(1)}` as keyof IUsageLimit;
    const limit = (usage[maxKey] as number) ?? 3;
    const used = (usage[category] as number) ?? 0;
    const resetAt = `${todayUTC()}T23:59:59Z`;

    return {
      allowed: used < limit,
      limit,
      used,
      resetAt,
    };
  }

  /**
   * Increment the usage counter for a category.
   * Call this AFTER the operation succeeds.
   */
  async incrementUsage(userId: string, category: UsageCategory): Promise<void> {
    const date = todayUTC();
    await UsageLimit.updateOne(
      { userId: new mongoose.Types.ObjectId(userId), date },
      { $inc: { [category]: 1 } }
    );

    auditService.log("USAGE_TRACKED" as any, userId, { category, date });
  }

  /**
   * Returns full usage summary for a user (for profile/dashboard display)
   */
  async getUsageSummary(userId: string): Promise<{
    date: string;
    imageGeneration: { used: number; limit: number };
    imageEditing: { used: number; limit: number };
    visionAnalysis: { used: number; limit: number };
    fileUploadAnalysis: { used: number; limit: number };
  }> {
    const usage = await this.getTodayUsage(userId);
    return {
      date: usage.date,
      imageGeneration: { used: usage.imageGeneration, limit: usage.maxImageGeneration },
      imageEditing: { used: usage.imageEditing, limit: usage.maxImageEditing },
      visionAnalysis: { used: usage.visionAnalysis, limit: usage.maxVisionAnalysis },
      fileUploadAnalysis: { used: usage.fileUploadAnalysis, limit: usage.maxFileUploadAnalysis },
    };
  }
}

export const usageLimitService = new UsageLimitService();
