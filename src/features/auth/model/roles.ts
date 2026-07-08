export const USER_ROLES = {
  SUPER_ADMIN: "superadmin",
  ADMIN: "admin",
  PREPARED_BY: "preparedby",
  REVIEWER_QA: "reviewer_qa",
  REVIEWER_PR: "reviewer_pr",
  APPROVED_BY: "approvedby",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.SUPER_ADMIN]: "Super Admin",
  [USER_ROLES.ADMIN]: "Admin",
  [USER_ROLES.PREPARED_BY]: "Prepared By",
  [USER_ROLES.REVIEWER_QA]: "Reviewer — QA",
  [USER_ROLES.REVIEWER_PR]: "Reviewer — Production",
  [USER_ROLES.APPROVED_BY]: "Approved By",
};

export const USER_ROLE_OPTIONS = Object.values(USER_ROLES).map((value) => ({
  value,
  label: USER_ROLE_LABELS[value],
}));
