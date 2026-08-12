import { normalizeApprovalStatus } from "../model/masterData.permissions";
import type { ApprovalStatus } from "../api/masterData.types";

const styles: Record<ApprovalStatus, string> = {
  draft: "bg-draft-bg text-draft-fg",
  pending: "bg-inreview-bg text-inreview-fg",
  approved: "bg-approved-bg text-approved-fg",
  rejected: "bg-rejected-bg text-rejected-fg",
};

const labels: Record<ApprovalStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

interface ApprovalStatusBadgeProps {
  status: string | undefined | null;
}

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  const normalized = normalizeApprovalStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-micro font-semibold ${styles[normalized]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {labels[normalized]}
    </span>
  );
}
