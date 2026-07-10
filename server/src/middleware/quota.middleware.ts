import { Request, Response, NextFunction } from "express";
import { usageService, QuotaFeature } from "../services/usage.service";

/**
 * Middleware factory to validate daily usage limits before calling expensive AI APIs.
 * Matches specifications for HTTP 429 error responses.
 */
export function checkQuota(feature: QuotaFeature) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const { allowed } = await usageService.checkQuota(userId, feature);

      if (!allowed) {
        res.status(429).json({
          success: false,
          error: "DAILY_LIMIT_REACHED",
          feature,
          remaining: 0,
          message: `Daily free limit reached. Upgrade to Pro.`,
        });
        return;
      }

      // Attach feature configuration to request for the controller increment trigger
      (req as any).quotaFeature = feature;
      next();
    } catch (err: any) {
      console.error("[QuotaMiddleware] Exception encountered:", err.message);
      next();
    }
  };
}
