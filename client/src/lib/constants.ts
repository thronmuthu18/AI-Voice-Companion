export const APP_NAME = "MuthuAI";

export const API_BASE_URL =
  "http://localhost:5000/api";

export const TOKEN_KEY =
  "muthuai_access_token";

export const USER_KEY =
  "muthuai_user";

export const API_ENDPOINTS = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  PROFILE: "/user/profile",

  CHAT: "/chat",
  AI_CHAT: "/ai/chat",
  AI_STREAM: "/ai/stream",

  MESSAGE: "/message",
} as const;