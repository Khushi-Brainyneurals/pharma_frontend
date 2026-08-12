import { USER_ROLES, type UserRole } from "../../auth/model/roles";
import type { ApprovalState, ApprovalStatus } from "../api/masterData.types";

/**
 * Master data is authored by Reviewer - QA and by the Approver; the Approver is
 * the only role that can decide a submission. Every other role is view-only.
 * The backend is the real gate - this only keeps unusable controls off screen.
 */
const EDITOR_ROLES: readonly UserRole[] = [USER_ROLES.REVIEWER_QA, USER_ROLES.APPROVED_BY];
const DECIDER_ROLES: readonly UserRole[] = [USER_ROLES.APPROVED_BY];

export interface MasterDataPermissions {
  canEdit: boolean;
  canDecide: boolean;
  isReadOnly: boolean;
}

export function getMasterDataPermissions(role: UserRole | undefined): MasterDataPermissions {
  const canEdit = Boolean(role && EDITOR_ROLES.includes(role));
  const canDecide = Boolean(role && DECIDER_ROLES.includes(role));

  return { canEdit, canDecide, isReadOnly: !canEdit };
}

export function normalizeApprovalStatus(value: string | undefined | null): ApprovalStatus {
  const status = value?.trim().toLowerCase();

  if (status === "pending" || status === "submitted" || status === "in_review") {
    return "pending";
  }

  if (status === "approved") {
    return "approved";
  }

  if (status === "rejected") {
    return "rejected";
  }

  return "draft";
}

/** Pending submissions are frozen for everyone; the backend answers 423 too. */
export function isPendingApproval(approval: ApprovalState | null) {
  return normalizeApprovalStatus(approval?.status) === "pending";
}

export interface EditabilityInput {
  permissions: MasterDataPermissions;
  approval: ApprovalState | null;
  /** Set once a request has come back 423 for this record. */
  isLockedByServer?: boolean;
}

export interface Editability {
  canEdit: boolean;
  canSubmit: boolean;
  canDecide: boolean;
  isLocked: boolean;
  reason: string | null;
}

export function getEditability({
  permissions,
  approval,
  isLockedByServer = false,
}: EditabilityInput): Editability {
  const status = normalizeApprovalStatus(approval?.status);
  const isLocked = isLockedByServer || status === "pending";

  return {
    canEdit: permissions.canEdit && !isLocked,
    canSubmit: permissions.canEdit && !isLocked && status !== "approved",
    canDecide: permissions.canDecide && status === "pending",
    isLocked,
    reason: !permissions.canEdit
      ? "Your role has view-only access to master data."
      : isLocked
        ? "This record is locked while it is pending Approver review."
        : null,
  };
}
