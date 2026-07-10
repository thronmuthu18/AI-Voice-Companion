import mongoose from "mongoose";
import Usage, { IUsage } from "../models/Usage.model";
import User from "../models/User.model";
import { entitlementService } from "./entitlement.service";

export type QuotaFeature =
  | "textChats"
  | "imageGenerate"
  | "imageEdit"
  | "imageAnalyze"
  | "videoGenerate"
  | "fileUpload"
  | "audioGenerate"
  | "audioTranscribe";

function toCanonicalFeature(feature: QuotaFeature): "textChat" | "imageGenerate" | "videoGenerate" | "fileGenerate" {
  if (feature === "textChats") return "textChat";
  if (feature === "imageGenerate") return "imageGenerate";
  if (feature === "videoGenerate") return "videoGenerate";
  if (feature === "fileUpload") return "fileGenerate";
  return "textChat"; // fallback
}

export class UsageService {
  /**
   * Retrieves today's usage document for a user.
   */
  async getTodayUsage(userId: string): Promise<IUsage> {
    const date = new Date().toISOString().split("T")[0];
    const user = await User.findById(userId).select("subscription").lean();
    const plan = (user?.subscription as any) || "free";

    let usage = await Usage.findOne({ userId: new mongoose.Types.ObjectId(userId), date });

    if (!usage) {
      try {
        usage = await Usage.create({
          userId: new mongoose.Types.ObjectId(userId),
          date,
          plan,
        });
      } catch (err: any) {
        if (err.code === 11000) {
          usage = await Usage.findOne({ userId: new mongoose.Types.ObjectId(userId), date });
        } else {
          throw err;
        }
      }
    }

    return usage!;
  }

  /**
   * Legacy quota check wrapper, delegating to the new EntitlementService.
   */
  async checkQuota(
    userId: string,
    feature: QuotaFeature
  ): Promise<{ allowed: boolean; limit: number; used: number }> {
    const canonical = toCanonicalFeature(feature);
    const result = await entitlementService.checkEntitlement(userId, canonical);
    return {
      allowed: result.allowed,
      limit: result.limit === null ? 999999 : result.limit,
      used: result.used,
    };
  }

  /**
   * Legacy increment wrapper, delegating to EntitlementService atomic reservation.
   */
  async incrementUsage(
    userId: string,
    feature: QuotaFeature
  ): Promise<void> {
    const canonical = toCanonicalFeature(feature);
    await entitlementService.reserveQuota(userId, canonical);
  }
}

export const usageService = new UsageService();
