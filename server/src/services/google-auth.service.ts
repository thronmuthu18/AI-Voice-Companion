import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";

export interface GoogleUserPayload {
  googleId: string;
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
}

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }

  /**
   * Verifies a Google ID token received from the frontend.
   *
   * Security checks performed:
   * - Cryptographic signature validity (using Google's public keys)
   * - Issuer must be accounts.google.com or https://accounts.google.com
   * - Audience must match our GOOGLE_CLIENT_ID (prevents token theft from other apps)
   * - Token must not be expired
   * - email_verified must be true (rejects unverified Google accounts)
   *
   * We NEVER trust user-supplied identity fields — all data comes from the verified payload.
   */
  async verifyGoogleToken(credential: string): Promise<GoogleUserPayload> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error("Google authentication is not configured on this server.");
    }

    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
    } catch (err: any) {
      // Map cryptographic failures to a safe error message
      console.warn("[GoogleAuthService] Token verification failed:", err.message);
      throw Object.assign(
        new Error("Invalid or expired Google credential. Please try signing in again."),
        { statusCode: 401, code: "INVALID_GOOGLE_TOKEN" }
      );
    }

    const payload = ticket.getPayload();
    if (!payload) {
      throw Object.assign(
        new Error("Google credential payload is empty."),
        { statusCode: 401, code: "INVALID_GOOGLE_TOKEN" }
      );
    }

    // Verify issuer explicitly (google-auth-library already does this but belt-and-suspenders)
    const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
    if (!payload.iss || !validIssuers.includes(payload.iss)) {
      throw Object.assign(
        new Error("Google credential issuer is invalid."),
        { statusCode: 401, code: "INVALID_GOOGLE_TOKEN" }
      );
    }

    // Reject accounts where Google has not verified the email
    if (!payload.email_verified) {
      throw Object.assign(
        new Error("Your Google account email is not verified. Please verify your Google account first."),
        { statusCode: 401, code: "GOOGLE_EMAIL_NOT_VERIFIED" }
      );
    }

    if (!payload.sub || !payload.email) {
      throw Object.assign(
        new Error("Google credential is missing required fields."),
        { statusCode: 401, code: "INVALID_GOOGLE_TOKEN" }
      );
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase().trim(),
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture || "",
      emailVerified: !!payload.email_verified,
    };
  }
}

export const googleAuthService = new GoogleAuthService();
