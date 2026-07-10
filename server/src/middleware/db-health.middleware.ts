import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

/**
 * Middleware that checks if MongoDB connection is established.
 * Prevents requests from hanging or throwing unhandled connection drops.
 */
export function dbHealthCheck(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // readyState 1 means connected
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: "Database service is temporarily unavailable. Please try again later.",
    });
    return;
  }
  next();
}
