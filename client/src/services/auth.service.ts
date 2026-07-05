import api from "./api";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
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
  ): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      "/auth/register",
      data
    );

    return response.data;
  }

  async getProfile() {
    const response = await api.get("/user/profile");

    return response.data;
  }
}

export const authService = new AuthService();