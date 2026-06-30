import { Request, Response } from "express";

export class AuthController {
  async register(req: Request, res: Response) {
    return res.status(501).json({
      success: false,
      message: "Register API under development",
    });
  }
}

export const authController = new AuthController();