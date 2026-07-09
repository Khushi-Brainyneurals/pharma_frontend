import axios from "axios";
import { getPersistedSession } from "../../features/auth/storage/auth.storage";
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
