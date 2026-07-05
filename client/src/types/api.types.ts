export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  accessToken: string;
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

export interface Message {
  _id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
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