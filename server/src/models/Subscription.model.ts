import mongoose, { Schema, Document } from "mongoose";
import { PlanCode } from "../config/plans.config";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  plan: PlanCode;
  status: "free" | "pending" | "active" | "past_due" | "cancelled" | "expired";
  startedAt: Date;
  expiresAt: Date | null;
  autoRenew: boolean;
  paymentProvider?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  lastPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["FREE", "BASIC_199", "PRO_299"],
      required: true,
      default: "FREE",
    },
    status: {
      type: String,
      enum: ["free", "pending", "active", "past_due", "cancelled", "expired"],
      required: true,
      default: "free",
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null, // lifetime for FREE
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    paymentProvider: {
      type: String,
    },
    providerCustomerId: {
      type: String,
    },
    providerSubscriptionId: {
      type: String,
    },
    lastPaymentId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find active subscription for a user
SubscriptionSchema.index({ userId: 1, status: 1 });

export default mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
