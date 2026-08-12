import axios from "axios";
import { getPersistedSession } from "../../features/auth/storage/auth.storage";
import { useAuthStore } from "../../features/auth/state/auth.store";
import { env } from "../config/env";

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.request.use((config) => {
  const accessToken = getPersistedSession()?.accessToken;

  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

/**
 * Centralized session-expiry detection - the single place that turns a 401
 * into the global Session Timeout Overlay, instead of every feature handling
 * it independently. Only requests that actually carried a Bearer token can
 * trigger it, so unauthenticated calls (e.g. the login form submitting wrong
 * credentials) keep behaving exactly as before and never show the overlay.
 */
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadAuthHeader = Boolean(
      axios.isAxiosError(error) && error.config?.headers?.Authorization,
    );

    if (axios.isAxiosError(error) && error.response?.status === 401 && hadAuthHeader) {
      const { isAuthenticated, sessionExpired, setSessionExpired } = useAuthStore.getState();
      if (isAuthenticated && !sessionExpired) {
        setSessionExpired(true);
      }
    }

    return Promise.reject(error);
  },
);
