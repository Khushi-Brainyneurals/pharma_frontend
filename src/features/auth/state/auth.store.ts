import { create } from "zustand";
import type { AuthSession, AuthenticatedUser } from "../api/auth.types";
import {
  clearPersistedSession,
  getPersistedSession,
  persistSession,
} from "../storage/auth.storage";

interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** Set by the httpClient response interceptor on a 401 from an authenticated request - drives the global Session Timeout Overlay. */
  sessionExpired: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  setSessionExpired: (value: boolean) => void;
}

const persistedSession = getPersistedSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: persistedSession?.user ?? null,
  accessToken: persistedSession?.accessToken ?? null,
  refreshToken: persistedSession?.refreshToken ?? null,
  isAuthenticated: Boolean(persistedSession?.accessToken),
  sessionExpired: false,
  setSession: (session) => {
    persistSession(session);
    set({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken ?? null,
      isAuthenticated: true,
      sessionExpired: false,
    });
  },
  clearSession: () => {
    clearPersistedSession();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      sessionExpired: false,
    });
  },
  setSessionExpired: (value) => set({ sessionExpired: value }),
}));
