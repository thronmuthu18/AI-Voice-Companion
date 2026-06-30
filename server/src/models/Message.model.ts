import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Omit<Document, 'model'> {
  chatId: mongoose.Types.ObjectId;
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokens?: number;
  model: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true },
    tokens: { type: Number },
    model: { type: String, required: true },
  },
  { timestamps: true }
);

export const Message = mongoose.model<IMessage>('Message', messageSchema);
