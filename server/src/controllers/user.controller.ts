import { Request, Response } from "express";
import User from "../models/User.model";

export class UserController {
  async getProfile(
    req: Request,
    res: Response
  ) {
    try {
      const userId = (req as any).user.userId;
      const user = await User.findById(userId).select("-password");

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
        message: error.message || "Internal Server Error",
      });
    }
  }
}

export const userController = new UserController();