import mongoose, { Schema, Document } from "mongoose";

export interface IUsage extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  plan: string;
  textChat: number;
  textChats: number; // legacy alias
  imageGenerate: number;
  imageEdit: number;
  imageAnalyze: number;
  videoGenerate: number;
  fileGenerate: number;
  fileUpload: number; // legacy/upload alias
  audioGenerate: number;
  audioTranscribe: number;
  tokensUsed: number;
  totalRequests: number;
  createdAt: Date;
  updatedAt: Date;
}

const UsageSchema = new Schema<IUsage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    plan: {
      type: String,
      required: true,
      default: "FREE",
    },
    textChat: { type: Number, default: 0 },
    textChats: { type: Number, default: 0 },
    imageGenerate: { type: Number, default: 0 },
    imageEdit: { type: Number, default: 0 },
    imageAnalyze: { type: Number, default: 0 },
    videoGenerate: { type: Number, default: 0 },
    fileGenerate: { type: Number, default: 0 },
    fileUpload: { type: Number, default: 0 },
    audioGenerate: { type: Number, default: 0 },
    audioTranscribe: { type: Number, default: 0 },
    tokensUsed: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring only one usage document per user per day
UsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IUsage>("Usage", UsageSchema);
