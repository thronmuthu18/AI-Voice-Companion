import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/User.model";
import BruteForceAttempt from "../models/BruteForceAttempt.model";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { emailService } from "./email.service";
import { googleAuthService } from "./google-auth.service";

export class AuthService {
  async register(
    name: string,
    email: string,
    password: string
  ) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpiresAt: expiresAt,
    });

    try {
      await emailService.sendVerificationEmail(user.email, user.name, rawToken);
    } catch (err: any) {
      console.error("[AuthService] Failed to send registration verification email:", err.message);
    }

    return user;
  }

  async login(
    email: string,
    password: string
  ) {
    const normalizedEmail = email.toLowerCase().trim();
    // Explicitly select password and emailVerificationTokenHash
    const user = await User.findOne({ email: normalizedEmail }).select("+password +emailVerificationTokenHash");

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password!
    );
      
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Check email verification status
    // If not verified, and has a token hash (meaning it's not a pre-migration user who we want to grandfather), reject
    if (!user.emailVerified && user.emailVerificationTokenHash) {
      throw Object.assign(new Error("Please verify your email address before signing in."), {
        code: "EMAIL_NOT_VERIFIED",
        statusCode: 403,
      });
    }

    const payload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async verifyEmail(rawToken: string) {
    if (!rawToken) {
      throw new Error("Verification token is required");
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.findOne({
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select("+emailVerificationTokenHash");

    if (!user) {
      throw new Error("This verification link is invalid or has expired.");
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return user;
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const key = `email:${normalizedEmail}`;
    const action = "resend_email";
    
    // Check resend attempt limit using BruteForceAttempt to prevent account enumeration side channels
    const oneHour = 60 * 60 * 1000;
    const record = await BruteForceAttempt.findOne({ key, action });
    if (record) {
      const timeElapsed = Date.now() - new Date(record.updatedAt).getTime();
      if (timeElapsed > oneHour) {
        record.count = 0;
        await record.save();
      } else if (record.count >= 3) {
        throw Object.assign(new Error("Too many verification requests. Please try again later."), {
          statusCode: 429,
          code: "RESEND_RATE_LIMITED",
        });
      }
    }

    // Increment resend attempt
    if (record) {
      record.count += 1;
      await record.save();
    } else {
      await BruteForceAttempt.create({ key, action, count: 1 });
    }

    const genericMessage = "If an eligible account exists, a verification email has been sent.";

    const user = await User.findOne({ email: normalizedEmail }).select("+emailVerificationTokenHash");
    if (!user || user.emailVerified) {
      return { message: genericMessage };
    }

    // Generate new secure verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.emailVerificationTokenHash = hashedToken;
    user.emailVerificationExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    try {
      await emailService.sendVerificationEmail(user.email, user.name, rawToken);
    } catch (err: any) {
      console.error("[AuthService] Resend email failed:", err.message);
    }

    return { message: genericMessage };
  }

  async googleAuth(credential: string) {
    // 1. Verify Google token on the backend
    const payload = await googleAuthService.verifyGoogleToken(credential);

    // 2. Find user by verified email
    let user = await User.findOne({ email: payload.email }).select("+googleId");

    if (user) {
      // 3. Link account if not already linked
      if (!user.googleId) {
        user.googleId = payload.googleId;
        user.emailVerified = true; // Google email is verified
        if (user.provider === "local") {
          user.provider = "local_google";
        }
        await user.save();
      } else if (user.googleId !== payload.googleId) {
        // Prevent mismatch / security issue
        throw Object.assign(new Error("Google account mismatch for this email address."), {
          statusCode: 400,
          code: "GOOGLE_ACCOUNT_MISMATCH",
        });
      }
    } else {
      // 4. Create new Google user
      user = await User.create({
        name: payload.name,
        email: payload.email,
        emailVerified: true,
        provider: "google",
        googleId: payload.googleId,
        avatar: payload.picture,
      });
    }

    const tokenPayload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();