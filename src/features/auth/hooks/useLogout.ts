import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../app/routing/routes";
import { logout } from "../api/auth.api";
import { getStoredRefreshToken } from "../storage/auth.storage";
import { useAuthStore } from "../state/auth.store";

export function useLogout() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const refreshToken = getStoredRefreshToken();

      if (refreshToken) {
        await logout({ refresh_token: refreshToken });
      }
    } catch {
      // Local cleanup must still win if the server-side logout request fails.
    } finally {
      clearSession();
      navigate(ROUTES.login, { replace: true });
      setIsLoggingOut(false);
    }
  }

  return { isLoggingOut, handleLogout };
}
