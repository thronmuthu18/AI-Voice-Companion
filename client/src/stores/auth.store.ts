import { create } from "zustand";

import { authService } from "../services/auth.service";

import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
} from "../lib/constants";

import type {
  LoginRequest,
  RegisterRequest,
  User,
} from "../types/api.types";



interface AuthState {

  user: User | null;

  token: string | null;

  isAuthenticated: boolean;

  isLoading: boolean;



  login: (data: LoginRequest) => Promise<void>;

  register: (data: RegisterRequest) => Promise<void>;

  googleLogin: (credential: string) => Promise<void>;

  logout: () => void;

  loadUser: () => Promise<void>;

}



export const useAuthStore = create<AuthState>((set) => ({

  user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),

  token: localStorage.getItem(TOKEN_KEY),

  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),

  isLoading: false,



  async login(data: LoginRequest) {

    set({ isLoading: true });



    try {

      const response = await authService.login(data);



      localStorage.setItem(

        TOKEN_KEY,

        response.accessToken

      );



      if (response.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      }



      localStorage.setItem(

        USER_KEY,

        JSON.stringify(response.user)

      );



      set({

        user: response.user,

        token: response.accessToken,

        isAuthenticated: true,

        isLoading: false,

      });

    } catch (error) {

      set({ isLoading: false });

      throw error;

    }

  },



  async register(data: RegisterRequest) {

    set({ isLoading: true });



    try {

      await authService.register(data);



      set({ isLoading: false });

    } catch (error) {

      set({ isLoading: false });

      throw error;

    }

  },

  async googleLogin(credential: string) {
    set({ isLoading: true });

    try {
      const response = await authService.googleAuth(credential);

      localStorage.setItem(TOKEN_KEY, response.accessToken);

      if (response.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      }

      localStorage.setItem(USER_KEY, JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout() {

    localStorage.removeItem(TOKEN_KEY);

    localStorage.removeItem(REFRESH_TOKEN_KEY);

    localStorage.removeItem(USER_KEY);



    set({

      user: null,

      token: null,

      isAuthenticated: false,

    });

  },



  async loadUser() {

    try {

      const response = await authService.getProfile();



      set({

        user: response.user,

        isAuthenticated: true,

      });

    } catch {

      localStorage.removeItem(TOKEN_KEY);

      localStorage.removeItem(USER_KEY);



      set({

        user: null,

        token: null,

        isAuthenticated: false,

      });

    }

  },

}));