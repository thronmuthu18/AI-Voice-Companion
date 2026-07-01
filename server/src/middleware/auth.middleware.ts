import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Authorization Header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
      return;
    }

    // Check Bearer Token
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
      return;
    }

    // Extract Token
    const token = authHeader.split(" ")[1];

    // Verify Token
    const payload = verifyAccessToken(token);

    // Attach User to Request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    // Continue to Next Middleware
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
    return;
  }
}