import api from "./api";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ApiResponse,
} from "../types/api.types";

export class AuthService {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      "/auth/login",
      data
    );

    return response.data;
  }

  async register(
    data: RegisterRequest
  ): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>(
      "/auth/register",
      data
    );

    return response.data;
  }

  async verifyEmail(token: string): Promise<ApiResponse> {
    const response = await api.get<ApiResponse>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`
    );
    return response.data;
  }

  async resendVerification(email: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>(
      "/auth/resend-verification",
      { email }
    );
    return response.data;
  }

  async googleAuth(credential: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      "/auth/google",
      { credential }
    );
    return response.data;
  }

  async getProfile() {
    const response = await api.get("/user/profile");

    return response.data;
  }
}

export const authService = new AuthService();