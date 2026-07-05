import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;

  sender: "user" | "assistant" | "system";

  content: string;

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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMessage>(
  "Message",
  MessageSchema
);