import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { auditService } from "../services/audit.service";
import User from "../models/User.model";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/muthuai_access_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      auditService.log("SECURITY_EVENT" as any, undefined, {
        reason: "jwt_missing_token",
        url: req.originalUrl,
      }, req.ip);

      res.status(401).json({
        success: false,
        message: "Authorization token missing or expired",
      });
      return;
    }

    // Verify JWT signature and expiration
    const payload = verifyAccessToken(token);

    // Reject revoked tokens / inactive users / locked accounts
    const user = await User.findById(payload.userId).select("isActive lockUntil");
    if (!user) {
      auditService.log("SECURITY_EVENT" as any, payload.userId, {
        reason: "jwt_user_revoked_not_found",
      }, req.ip);

      res.status(401).json({
        success: false,
        message: "User account has been deleted or revoked",
      });
      return;
    }

    if (!user.isActive) {
      auditService.log("SECURITY_EVENT" as any, payload.userId, {
        reason: "jwt_user_deactivated",
      }, req.ip);

      res.status(401).json({
        success: false,
        message: "User account is inactive. Please contact support.",
      });
      return;
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      auditService.log("SECURITY_EVENT" as any, payload.userId, {
        reason: "jwt_user_locked_out",
      }, req.ip);

      res.status(401).json({
        success: false,
        message: "User account is temporarily locked.",
      });
      return;
    }

    (req as any).user = payload;
    next();
  } catch (err: any) {
    const isExpired = err.name === "TokenExpiredError";
    const isMalformed = err.name === "JsonWebTokenError";
    const reason = isExpired
      ? "token_expired"
      : isMalformed
      ? "invalid_signature_or_malformed"
      : "verification_failed";

    auditService.log("SECURITY_EVENT" as any, undefined, {
      reason: `jwt_${reason}`,
      error: err.message,
    }, req.ip);

    res.status(401).json({
      success: false,
      message: isExpired ? "Token has expired" : "Invalid token signature or malformed token",
    });
  }
}