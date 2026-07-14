import { Request, Response } from "express";
import User from "../models/User.model";

export class UserController {
  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      // Exclude all sensitive and internal-only fields from profile response
      const user = await User.findById(userId).select(
        "-password -refreshTokens -failedLoginAttempts -lockUntil"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Profile fetched successfully",
        user,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }

  async getUsageSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { usageService } = require("../services/usage.service");
      const summary = await usageService.getTodayUsage(userId);

      return res.status(200).json({
        success: true,
        usage: summary,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }
}

export const userController = new UserController();