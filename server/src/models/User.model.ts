import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  googleId?: string;
  username: string;
  fullName: string;
  bio?: string;
  country?: string;
  language: string;
  theme: string;
  role: 'user' | 'admin';
  subscriptionId?: string;
  createdAt: Date;
  lastLogin: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String }, // Optional for Google OAuth users
    googleId: { type: String },
    username: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    bio: { type: String },
    country: { type: String },
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'light' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
