import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  provider: "local" | "google" | "github" | "local_google";
  role: "user" | "admin";
  subscription: "free" | "pro";
  emailVerified: boolean;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  googleId?: string | null;
  emailVerificationResendCount?: number;
  emailVerificationLastResendAt?: Date | null;
  isActive: boolean;
  lastLogin?: Date;
  // Brute-force protection
  failedLoginAttempts: number;
  lockUntil?: Date;
  // Multi-device refresh token store
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      select: false, // Never returned by default — must be explicitly selected
    },

    avatar: {
      type: String,
      default: "",
    },

    provider: {
      type: String,
      enum: ["local", "google", "github", "local_google"],
      default: "local",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    subscription: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
    },

    emailVerificationResendCount: {
      type: Number,
      default: 0,
    },

    emailVerificationLastResendAt: {
      type: Date,
      default: null,
    },

    googleId: {
      type: String,
      default: null,
      index: { unique: true, sparse: true },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },

    // Brute-force protection
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    // Stores hashed refresh tokens per device
    refreshTokens: {
      type: [String],
      default: [],
      select: false, // Never returned by default
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", UserSchema);
