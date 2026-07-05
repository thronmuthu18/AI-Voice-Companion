import mongoose, { Schema, Document } from "mongoose";

export interface IChat extends Document {
  userId: mongoose.Types.ObjectId;

  title: string;

  lastMessage?: string;

  isPinned: boolean;

  isArchived: boolean;

  createdAt: Date;

  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    lastMessage: {
      type: String,
      default: "",
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IChat>(
  "Chat",
  ChatSchema
);