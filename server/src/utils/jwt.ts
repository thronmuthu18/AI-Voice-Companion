import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

const jwtSecret: Secret = env.JWT_SECRET as Secret;
const jwtRefreshSecret: Secret = (env as any).JWT_REFRESH_SECRET as Secret;

// Access token: short-lived (15 minutes)
export function generateAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: "15m",
  };
  return jwt.sign(payload, jwtSecret, options);
}

// Refresh token: long-lived (7 days)
export function generateRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: "7d",
  };
  return jwt.sign(payload, jwtRefreshSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, jwtSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, jwtRefreshSecret) as JwtPayload;
}