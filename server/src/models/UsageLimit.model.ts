import mongoose, { Schema, Document } from "mongoose";

// Usage categories tracked for per-user daily limits
export interface IUsageLimit extends Document {
  userId: mongoose.Types.ObjectId;
  // Daily counters (reset at UTC midnight each day)
  date: string; // YYYY-MM-DD format — one doc per user per day
  imageGeneration: number;
  imageEditing: number;
  visionAnalysis: number;
  fileUploadAnalysis: number;
  // Soft quota limits (defaults match Free tier)
  maxImageGeneration: number;
  maxImageEditing: number;
  maxVisionAnalysis: number;
  maxFileUploadAnalysis: number;
  createdAt: Date;
  updatedAt: Date;
}

const UsageLimitSchema = new Schema<IUsageLimit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // One document per user per calendar day (UTC)
    date: {
      type: String,
      required: true,
      index: true,
    },
    // Usage counters
    imageGeneration: { type: Number, default: 0 },
    imageEditing: { type: Number, default: 0 },
    visionAnalysis: { type: Number, default: 0 },
    fileUploadAnalysis: { type: Number, default: 0 },
    // Limits (per-day quota)
    maxImageGeneration: { type: Number, default: 3 },
    maxImageEditing: { type: Number, default: 3 },
    maxVisionAnalysis: { type: Number, default: 3 },
    maxFileUploadAnalysis: { type: Number, default: 3 },
  },
  {
    timestamps: true,
  }
);

// Compound index: one record per user per day — prevents duplicate docs
UsageLimitSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IUsageLimit>("UsageLimit", UsageLimitSchema);
