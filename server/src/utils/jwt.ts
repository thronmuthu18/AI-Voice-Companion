import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

const jwtSecret: Secret = env.JWT_SECRET as Secret;

export function generateAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: "1d",
  };

  return jwt.sign(payload, jwtSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, jwtSecret) as JwtPayload;
}