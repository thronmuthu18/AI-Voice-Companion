import rateLimit from "express-rate-limit";
import { auditService } from "../services/audit.service";
import { Request, Response } from "express";

// Central handler for rate limit violations
const limitHandler = (type: string, message: string) => {
  return (req: Request, res: Response): void => {
    const userId = (req as any).user?.userId || "anonymous";

    auditService.log("SECURITY_EVENT" as any, userId, {
      reason: "rate_limit_violation",
      limiterType: type,
      url: req.originalUrl,
    }, req.ip);

    res.status(429).json({
      success: false,
      message,
    });
  };
};

// General API rate limiter (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: limitHandler("general_api", "Too many requests. Please try again later."),
});

// Auth endpoints (login/register) — strict (10 per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: limitHandler("auth_api", "Too many authentication attempts. Please try again in 15 minutes."),
});

// Image generation/editing (20 per 15 minutes)
export const imageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: limitHandler("image_api", "Image generation limit reached. Please try again later."),
});

// File upload (30 per 15 minutes)
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: limitHandler("upload_api", "Upload limit reached. Please try again later."),
});

// Streaming AI (50 per 15 minutes)
export const streamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: limitHandler("stream_api", "Streaming request limit reached. Please try again later."),
});

// Per-minute burst limiter for AI chat endpoints (anti-abuse, separate from daily quotas)
// Prevents rapid-fire automated prompts even for PRO users with unlimited daily quotas
export const burstLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 15,              // 15 requests per minute max
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: limitHandler("burst_abuse", "Too many requests in a short window. Please slow down and try again."),
});

// Resend verification email rate limiter (5 requests per hour per IP)
export const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: limitHandler("resend_api", "Too many verification email requests from this IP. Please try again in an hour."),
});
