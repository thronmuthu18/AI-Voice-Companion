import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { authService } from "../services/auth.service";
import { auditService } from "../services/audit.service";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import User from "../models/User.model";
import { BruteForceService } from "../middleware/brute-force.middleware";
import bcrypt from "bcrypt";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AuthController {

  async register(req: Request, res: Response) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;
    const ipKey = `ip:${req.ip}`;
    const emailKey = email ? `email:${email.toLowerCase().trim()}` : null;

    try {
      const user = await authService.register(name, email, password);

      const userResponse = user.toJSON() as any;
      delete userResponse.password;
      delete userResponse.refreshTokens;

      auditService.log("REGISTER", String(user._id), { email }, req.ip);

      // Reset brute force trackers on success
      await BruteForceService.recordSuccess(ipKey, "register");
      if (emailKey) {
        await BruteForceService.recordSuccess(emailKey, "register");
      }

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: userResponse,
      });

    } catch (error: any) {
      // Record failure for registration brute force tracking
      await BruteForceService.recordFailure(ipKey, "register");
      if (emailKey) {
        await BruteForceService.recordFailure(emailKey, "register");
      }

      auditService.log("FAILED_LOGIN", undefined, { reason: "register_failed", error: error.message }, req.ip);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const ipKey = `ip:${req.ip}`;
    const emailKey = email ? `email:${email.toLowerCase().trim()}` : null;

    try {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Look up user directly to apply brute-force checks
      const user = await User.findOne({ email: email.toLowerCase().trim() });

      if (!user || !user.password) {
        auditService.log("FAILED_LOGIN", undefined, { email }, req.ip);
        
        // Track unified brute force failure
        await BruteForceService.recordFailure(ipKey, "login");
        if (emailKey) await BruteForceService.recordFailure(emailKey, "login");

        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > new Date()) {
        const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
        auditService.log("FAILED_LOGIN", String(user._id), { reason: "account_locked", minutesLeft }, req.ip);
        return res.status(423).json({
          success: false,
          message: `Account is temporarily locked. Try again in ${minutesLeft} minute(s).`,
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        const updateData: any = { failedLoginAttempts: newAttempts };

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          updateData.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
          auditService.log("ACCOUNT_LOCKED", String(user._id), { failedAttempts: newAttempts }, req.ip);
        }

        await User.findByIdAndUpdate(user._id, updateData);
        auditService.log("FAILED_LOGIN", String(user._id), { attempt: newAttempts }, req.ip);

        // Track unified brute force failure
        await BruteForceService.recordFailure(ipKey, "login");
        if (emailKey) await BruteForceService.recordFailure(emailKey, "login");

        return res.status(401).json({
          success: false,
          message:
            newAttempts >= MAX_FAILED_ATTEMPTS
              ? "Account locked due to too many failed attempts. Try again in 15 minutes."
              : `Invalid credentials. ${MAX_FAILED_ATTEMPTS - newAttempts} attempt(s) remaining.`,
        });
      }

      // Success — reset failed attempts
      const payload = {
        userId: String(user._id),
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      // Store hashed refresh token for multi-device support
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 8);
      await User.findByIdAndUpdate(user._id, {
        $push: { refreshTokens: hashedRefreshToken },
        $set: {
          failedLoginAttempts: 0,
          lockUntil: null,
          lastLogin: new Date(),
        },
      });

      const userResponse = user.toJSON() as any;
      delete userResponse.password;
      delete userResponse.refreshTokens;

      auditService.log("LOGIN", String(user._id), { email }, req.ip);

      // Reset brute force trackers on success
      await BruteForceService.recordSuccess(ipKey, "login");
      if (emailKey) {
        await BruteForceService.recordSuccess(emailKey, "login");
      }

      // Set secure HttpOnly cookies for additional XSS protection
      res.cookie("muthuai_access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      res.cookie("muthuai_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        user: userResponse,
      });

    } catch (error: any) {
      auditService.log("FAILED_LOGIN", undefined, { reason: "login_error", error: error.message }, req.ip);
      return res.status(500).json({
        success: false,
        message: "An error occurred during login. Please try again.",
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const ipKey = `ip:${req.ip}`;
    const emailKey = `email:${email.toLowerCase().trim()}`;

    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        auditService.log("FAILED_LOGIN", undefined, { reason: "reset_password_user_not_found", email }, req.ip);

        // Record brute force failure
        await BruteForceService.recordFailure(ipKey, "reset");
        await BruteForceService.recordFailure(emailKey, "reset");

        return res.status(404).json({
          success: false,
          message: "Email address not found",
        });
      }

      auditService.log("SECURITY_EVENT" as any, String(user._id), { reason: "password_reset_requested", email }, req.ip);

      // Reset brute force trackers on success
      await BruteForceService.recordSuccess(ipKey, "reset");
      await BruteForceService.recordSuccess(emailKey, "reset");

      return res.status(200).json({
        success: true,
        message: "Password reset link sent successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      // Verify refresh token signature
      let payload: any;
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token",
        });
      }

      // Check the token exists in the user's stored token list
      const user = await User.findById(payload.userId);
      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      // Verify the provided token matches one of the stored hashed tokens
      let tokenValid = false;
      for (const hashed of user.refreshTokens) {
        if (await bcrypt.compare(refreshToken, hashed)) {
          tokenValid = true;
          break;
        }
      }

      if (!tokenValid) {
        auditService.log("SECURITY_EVENT", String(user._id), { reason: "refresh_token_reuse_detected" }, req.ip);
        return res.status(401).json({
          success: false,
          message: "Refresh token has been revoked",
        });
      }

      // Issue new access token
      const newAccessToken = generateAccessToken({
        userId: String(user._id),
        email: user.email,
        role: user.role,
      });

      res.cookie("muthuai_access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      return res.status(200).json({
        success: true,
        accessToken: newAccessToken,
      });

    } catch {
      return res.status(500).json({
        success: false,
        message: "An error occurred. Please try again.",
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const userId = (req as any).user?.userId;

      if (refreshToken && userId) {
        const user = await User.findById(userId);
        if (user) {
          // Remove this specific device's refresh token
          const remaining: string[] = [];
          for (const hashed of user.refreshTokens) {
            const matches = await bcrypt.compare(refreshToken, hashed);
            if (!matches) {
              remaining.push(hashed);
            }
          }
          await User.findByIdAndUpdate(userId, { refreshTokens: remaining });
        }
      }

      auditService.log("LOGOUT", userId, {}, req.ip);

      res.clearCookie("muthuai_access_token");
      res.clearCookie("muthuai_refresh_token");

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });

    } catch {
      return res.status(500).json({
        success: false,
        message: "Logout failed. Please try again.",
      });
    }
  }

  async logoutAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (userId) {
        // Revoke all refresh tokens (all devices)
        await User.findByIdAndUpdate(userId, { refreshTokens: [] });
      }

      auditService.log("LOGOUT_ALL", userId, {}, req.ip);

      res.clearCookie("muthuai_access_token");
      res.clearCookie("muthuai_refresh_token");

      return res.status(200).json({
        success: true,
        message: "Logged out from all devices successfully",
      });

    } catch {
      return res.status(500).json({
        success: false,
        message: "Logout failed. Please try again.",
      });
    }
  }
}

export const authController = new AuthController();