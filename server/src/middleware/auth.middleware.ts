import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
      return;
    }

    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
      return;
    }

    const token = authHeader.substring(7);

    const payload = verifyAccessToken(token);

    (req as any).user = payload;

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}