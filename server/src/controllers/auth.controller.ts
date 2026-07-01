import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { authService } from "../services/auth.service";

export class AuthController {

  async register(req: Request, res: Response) {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    try {

      const { name, email, password } = req.body;

      const user = await authService.register(
        name,
        email,
        password
      );

      const userResponse = user.toJSON();
      delete userResponse.password;

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: userResponse,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }

  async login(req: Request, res: Response) {

    try {

      const { email, password } = req.body;

      const result = await authService.login(
        email,
        password
      );

      const userResponse = result.user.toJSON();
      delete userResponse.password;

      return res.status(200).json({
        success: true,
        message: "Login successful",
        accessToken: result.accessToken,
        user: userResponse,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }

}

export const authController = new AuthController();