import axios from "axios";
import {
  API_BASE_URL,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "../lib/constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent infinite refresh loops
let isRefreshing = false;
// Queue of requests waiting for the new token
let refreshQueue: Array<(token: string) => void> = [];

function processRefreshQueue(newToken: string) {
  refreshQueue.forEach((resolve) => resolve(newToken));
  refreshQueue = [];
}

// Request Interceptor — attach the current access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor — transparently refresh expired tokens
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and only once per request
    if (error.response?.status === 401 && !originalRequest._retried) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      // No refresh token stored — force logout
      if (!refreshToken) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the in-progress refresh to complete, then retry
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
          // Reject if refresh fails
          setTimeout(() => reject(error), 10000);
        });
      }

      originalRequest._retried = true;
      isRefreshing = true;

      try {
        // Call the refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = response.data.accessToken;
        localStorage.setItem(TOKEN_KEY, newAccessToken);

        // Apply new token to the original request and retry
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processRefreshQueue(newAccessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear all tokens and redirect to login
        isRefreshing = false;
        refreshQueue = [];
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;