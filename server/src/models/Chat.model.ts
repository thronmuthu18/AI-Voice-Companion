import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Omit<Document, 'model'> {
  userId: mongoose.Types.ObjectId;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Chat' },
    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    model: { type: String, default: 'gpt-4o' },
  },
  { timestamps: true }
);

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
