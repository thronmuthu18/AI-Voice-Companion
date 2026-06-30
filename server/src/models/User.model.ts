import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;

  avatar?: string;

  provider: "local" | "google" | "github";

  role: "user" | "admin";

  subscription: "free" | "pro";

  emailVerified: boolean;

  isActive: boolean;

  lastLogin?: Date;

  createdAt: Date;

  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
    },

    avatar: {
      type: String,
      default: "",
    },

    provider: {
      type: String,
      enum: ["local", "google", "github"],
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

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", UserSchema);