import { Request, Response, NextFunction } from "express";
import { usageLimitService, UsageCategory } from "../services/usage-limit.service";
import { auditService } from "../services/audit.service";

/**
 * Factory: creates a middleware that checks a user's daily quota for a
 * specific category BEFORE allowing the request to proceed.
 *
 * Usage:
 *   router.post("/ai/stream", authenticate, checkUsageLimit("imageGeneration"), handler)
 */
export function checkUsageLimit(category: UsageCategory) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { allowed, limit, used, resetAt } = await usageLimitService.checkUsage(userId, category);

      if (!allowed) {
        auditService.log("SECURITY_EVENT" as any, userId, {
          reason: "usage_limit_exceeded",
          category,
          used,
          limit,
        }, req.ip);

        res.set("X-RateLimit-Category", category);
        res.set("X-RateLimit-Limit", String(limit));
        res.set("X-RateLimit-Used", String(used));
        res.set("X-RateLimit-Reset", resetAt);
        res.set("Retry-After", resetAt);

        res.status(429).json({
          success: false,
          message: `Daily ${category} limit reached (${used}/${limit}). Resets at ${resetAt}. Upgrade to Pro for higher limits.`,
          limitInfo: { category, used, limit, resetAt },
        });
        return;
      }

      // Attach usage info to request for the controller to increment after success
      (req as any).usageCategory = category;
      next();
    } catch (err: any) {
      // If usage check fails, allow through (don't block users on internal errors)
      console.error("[UsageLimitMiddleware] Error checking usage:", err.message);
      next();
    }
  };
}

/**
 * Increments a usage counter after a successful AI operation.
 * Call this in the controller AFTER the AI call completes.
 */
export async function incrementUsage(req: Request, category: UsageCategory): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (userId) {
      await usageLimitService.incrementUsage(userId, category);
    }
  } catch (err: any) {
    console.error("[UsageLimitMiddleware] Error incrementing usage:", err.message);
  }
}
