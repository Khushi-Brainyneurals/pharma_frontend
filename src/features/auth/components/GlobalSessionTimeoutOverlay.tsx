import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../../../app/routing/routes";
import { useAuthStore } from "../state/auth.store";
import { SessionTimeoutOverlay } from "./SessionTimeoutOverlay";

/**
 * Mounted once at the application root (see `app/App.tsx`), so it renders
 * above whichever route is active. Session expiry itself is detected in one
 * place - the httpClient response interceptor - which flips `sessionExpired`
 * in the auth store on any 401 from an authenticated request; this component
 * only reacts to that flag.
 *
 * Recovery behavior matches the original `format-preview` overlay exactly:
 * clear the local session, then send the user to Login with the same
 * `authNotice` shape `ProtectedRoute` already uses for an expired session.
 */
export function GlobalSessionTimeoutOverlay() {
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const location = useLocation();

  // Never show the "sign in again" overlay on top of the sign-in page itself.
  if (!sessionExpired || location.pathname === ROUTES.login) {
    return null;
  }

  function handleSignIn() {
    clearSession();
    navigate(ROUTES.login, {
      replace: true,
      state: {
        from: location,
        authNotice: {
          variant: "info",
          message: "Your session timed out. Sign in again to continue. No document was created - nothing was lost.",
        },
      },
    });
  }

  return <SessionTimeoutOverlay onSignIn={handleSignIn} />;
}
