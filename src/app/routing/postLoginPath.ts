import type { UserRole } from "../../features/auth/model/roles";
import { USER_ROLES } from "../../features/auth/model/roles";
import { MASTER_DATA_ROUTES, ROUTES } from "./routes";

const DEFAULT_POST_LOGIN_PATH = ROUTES.statusBoard;

export function getPostLoginPath(role: UserRole) {
  if (role === USER_ROLES.ADMIN) {
    return ROUTES.employeeManagement;
  }

  if (role === USER_ROLES.PREPARED_BY) {
    return ROUTES.statusBoard;
  }

  // Reviewer - QA authors master data and the Approver signs it off, so the
  // master data hub is the landing page for both.
  if (role === USER_ROLES.REVIEWER_QA || role === USER_ROLES.APPROVED_BY) {
    return MASTER_DATA_ROUTES.hub;
  }

  return DEFAULT_POST_LOGIN_PATH;
}
