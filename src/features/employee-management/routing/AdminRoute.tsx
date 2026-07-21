import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "../../../app/routing/routes";
import { USER_ROLES } from "../../auth/model/roles";
import { useAuthStore } from "../../auth/state/auth.store";

export function AdminRoute() {
  const role = useAuthStore((state) => state.user?.role);
  return role === USER_ROLES.ADMIN ? (
    <Outlet />
  ) : (
    <Navigate to={ROUTES.statusBoard} replace />
  );
}
