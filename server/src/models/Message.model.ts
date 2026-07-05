import mongoose, { Schema, Document } from "mongoose";

export interface IAttachment {
  name: string;
  mimeType: string;
  url: string; // Base64 data URL
  size: number;
}

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;

  sender: "user" | "assistant" | "system";

  content: string;

  attachments?: IAttachment[];

  createdAt: Date;

  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },

    sender: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    attachments: [
      {
        name: { type: String, required: true },
        mimeType: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMessage>(
  "Message",
  MessageSchema
);