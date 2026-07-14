import mongoose, { Schema, Document } from "mongoose";

export interface IBruteForceAttempt extends Document {
  key: string; // e.g., "ip:127.0.0.1" or "email:test@champ.ai"
  action: string; // "login" | "register" | "reset"
  count: number;
  lockUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BruteForceAttemptSchema = new Schema<IBruteForceAttempt>(
  {
    key: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["login", "register", "reset", "resend_email"],
    },
    count: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One tracker per key + action combination
BruteForceAttemptSchema.index({ key: 1, action: 1 }, { unique: true });

export default mongoose.model<IBruteForceAttempt>("BruteForceAttempt", BruteForceAttemptSchema);
