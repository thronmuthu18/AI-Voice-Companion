export const APP_NAME = "Champ.ai";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const TOKEN_KEY =
  "champai_access_token";

export const REFRESH_TOKEN_KEY =
  "champai_refresh_token";

export const USER_KEY =
  "champai_user";

export const API_ENDPOINTS = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  PROFILE: "/user/profile",

  CHAT: "/chat",
  AI_CHAT: "/ai/chat",
  AI_STREAM: "/ai/stream",

  MESSAGE: "/message",
} as const;