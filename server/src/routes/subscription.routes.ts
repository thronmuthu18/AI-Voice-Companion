import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { entitlementService } from "../services/entitlement.service";
import { PLANS } from "../config/plans.config";

const router = Router();

// GET /api/v1/subscription/me
router.get("/subscription/me", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const planState = await entitlementService.getUserPlan(userId);
    const planConfig = PLANS[planState.plan] || PLANS.FREE;

    // Resolve daily usage states for all canonical features
    const textChatUsage = await entitlementService.checkEntitlement(userId, "textChat");
    const imageGenerateUsage = await entitlementService.checkEntitlement(userId, "imageGenerate");
    const videoGenerateUsage = await entitlementService.checkEntitlement(userId, "videoGenerate");
    const fileGenerateUsage = await entitlementService.checkEntitlement(userId, "fileGenerate");

    const daysRemaining = planState.expiresAt 
      ? Math.max(0, Math.ceil((new Date(planState.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return res.status(200).json({
      success: true,
      plan: planState.plan,
      status: planState.status,
      priceINR: planConfig.priceINR,
      startedAt: planState.startedAt,
      expiresAt: planState.expiresAt,
      daysRemaining,
      limits: planConfig.limits,
      usage: {
        textChat: {
          used: textChatUsage.used,
          limit: textChatUsage.limit,
          remaining: textChatUsage.remaining,
          resetAt: textChatUsage.resetAt,
        },
        imageGenerate: {
          used: imageGenerateUsage.used,
          limit: imageGenerateUsage.limit,
          remaining: imageGenerateUsage.remaining,
          resetAt: imageGenerateUsage.resetAt,
        },
        videoGenerate: {
          used: videoGenerateUsage.used,
          limit: videoGenerateUsage.limit,
          remaining: videoGenerateUsage.remaining,
          resetAt: videoGenerateUsage.resetAt,
        },
        fileGenerate: {
          used: fileGenerateUsage.used,
          limit: fileGenerateUsage.limit,
          remaining: fileGenerateUsage.remaining,
          resetAt: fileGenerateUsage.resetAt,
        }
      },
      upgradeAvailable: planState.plan !== "PRO_299",
    });
  } catch (err: any) {
    console.error("[SubscriptionRouter] Error getting subscription info:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/v1/plans
router.get("/plans", async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      plans: PLANS,
    });
  } catch (err: any) {
    console.error("[SubscriptionRouter] Error getting plans list:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
