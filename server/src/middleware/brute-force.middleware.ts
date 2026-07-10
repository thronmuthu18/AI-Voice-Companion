import { Request, Response, NextFunction } from "express";
import BruteForceAttempt from "../models/BruteForceAttempt.model";
import { auditService } from "../services/audit.service";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

export class BruteForceService {
  /**
   * Checks if a specific key (IP or email) is locked.
   */
  static async checkLock(
    key: string,
    action: "login" | "register" | "reset"
  ): Promise<{ locked: boolean; lockUntil: Date | null }> {
    const record = await BruteForceAttempt.findOne({ key, action });
    if (record && record.lockUntil && record.lockUntil > new Date()) {
      return { locked: true, lockUntil: record.lockUntil };
    }
    return { locked: false, lockUntil: null };
  }

  /**
   * Records a failed attempt for a key.
   */
  static async recordFailure(
    key: string,
    action: "login" | "register" | "reset"
  ): Promise<void> {
    const record = await BruteForceAttempt.findOne({ key, action });
    if (!record) {
      await BruteForceAttempt.create({ key, action, count: 1 });
      return;
    }

    const newCount = record.count + 1;
    const updateData: any = { count: newCount };
    if (newCount >= MAX_ATTEMPTS) {
      updateData.lockUntil = new Date(Date.now() + LOCK_DURATION);
    }
    await BruteForceAttempt.updateOne({ _id: record._id }, { $set: updateData });
  }

  /**
   * Resets failure counter upon successful attempt.
   */
  static async recordSuccess(
    key: string,
    action: "login" | "register" | "reset"
  ): Promise<void> {
    await BruteForceAttempt.deleteOne({ key, action });
  }
}

/**
 * Express middleware to prevent brute force attacks on auth routes.
 * Blocks request if the client IP or target email has exceeded failure limits.
 */
export function restrictBruteForce(action: "login" | "register" | "reset") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ipKey = `ip:${req.ip}`;
    const email = req.body?.email?.toLowerCase().trim();
    const emailKey = email ? `email:${email}` : null;

    try {
      // 1. Verify IP is not locked
      const ipLock = await BruteForceService.checkLock(ipKey, action);
      if (ipLock.locked) {
        const minutesLeft = Math.ceil((ipLock.lockUntil!.getTime() - Date.now()) / 60000);
        auditService.log("SECURITY_EVENT" as any, undefined, {
          reason: "brute_force_ip_lockout",
          action,
          ip: req.ip,
        }, req.ip);

        res.status(423).json({
          success: false,
          message: `Too many failed attempts from this IP. Please try again in ${minutesLeft} minute(s).`,
        });
        return;
      }

      // 2. Verify Email is not locked
      if (emailKey) {
        const emailLock = await BruteForceService.checkLock(emailKey, action);
        if (emailLock.locked) {
          const minutesLeft = Math.ceil((emailLock.lockUntil!.getTime() - Date.now()) / 60000);
          auditService.log("SECURITY_EVENT" as any, undefined, {
            reason: "brute_force_email_lockout",
            action,
            email,
          }, req.ip);

          res.status(423).json({
            success: false,
            message: `Too many failed attempts for this email address. Please try again in ${minutesLeft} minute(s).`,
          });
          return;
        }
      }

      next();
    } catch (err: any) {
      console.error("[BruteForceMiddleware] Error checking lock:", err.message);
      next();
    }
  };
}
