import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "../../../app/routing/routes";
import { useAuthStore } from "../state/auth.store";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{
          from: location,
          authNotice: {
            message:
              "Your session timed out. Sign in again to continue. No document was created - nothing was lost.",
            variant: "info",
          },
        }}
      />
    );
  }

  return <Outlet />;
}
