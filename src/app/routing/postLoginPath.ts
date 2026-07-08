import type { UserRole } from "../../features/auth/model/roles";
import { USER_ROLES } from "../../features/auth/model/roles";
import { ROUTES } from "./routes";

const DEFAULT_POST_LOGIN_PATH = ROUTES.statusBoard;

export function getPostLoginPath(role: UserRole) {
  if (role === USER_ROLES.PREPARED_BY) {
    return ROUTES.newDocument;
  }

  return DEFAULT_POST_LOGIN_PATH;
}
