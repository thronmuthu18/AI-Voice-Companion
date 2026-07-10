export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  subscription?: "free" | "pro";
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface Chat {
  _id: string;
  userId: string;
  title: string;
  lastMessage: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  name: string;
  mimeType: string;
  url: string; // Base64 data URL
  size: number;
  extractedText?: string;
}

export interface Message {
  _id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface AIChatResponse {
  success: boolean;
  response: string;
}

export interface CreateChatRequest {
  title: string;
}

export interface SendMessageRequest {
  chatId: string;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}