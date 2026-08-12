import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { Dialog } from "../../../shared/ui/Dialog";
import { FormError } from "../../../shared/ui/FormError";
import type { ApprovalController } from "../hooks/useApproval";
import type { Editability } from "../model/masterData.permissions";
import { normalizeApprovalStatus } from "../model/masterData.permissions";
import { ApprovalStatusBadge } from "./ApprovalStatusBadge";
import { MasterDataBanner } from "./MasterDataBanner";

interface ApprovalPanelProps {
  title: string;
  description: string;
  controller: ApprovalController;
  editability: Editability;
  /** Set when the content itself is not ready to be submitted yet. */
  submitBlockedReason?: string | null;
}

export function ApprovalPanel({
  title,
  description,
  controller,
  editability,
  submitBlockedReason,
}: ApprovalPanelProps) {
  const { approval, isLoading, isBusy, error, notice } = controller;
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const status = normalizeApprovalStatus(approval?.status);
  const canSubmit = editability.canSubmit && !submitBlockedReason;

  async function reject() {
    if (!reason.trim()) {
      setReasonError("A reason is required when rejecting.");
      return;
    }

    if (await controller.decide("rejected", reason.trim())) {
      setIsRejecting(false);
      setReason("");
      setReasonError(null);
    }
  }

  return (
    <section className="rounded-panel border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="mr-auto min-w-0">
          <h2 className="text-h3 font-semibold">{title}</h2>
          <p className="mt-1 text-small text-subdued">{description}</p>
        </div>
        {isLoading ? (
          <span className="h-6 w-24 animate-pulse rounded-pill bg-muted" aria-hidden="true" />
        ) : (
          <ApprovalStatusBadge status={approval?.status} />
        )}
      </div>

      <div className="space-y-4 px-5 py-4">
        {error ? <MasterDataBanner tone="error" message={error} /> : null}
        {notice ? <MasterDataBanner tone="success" message={notice} /> : null}

        {status === "rejected" && approval?.reject_reason ? (
          <MasterDataBanner
            tone="error"
            message={`Rejected - ${approval.reject_reason}`}
          />
        ) : null}

        {editability.isLocked ? (
          <MasterDataBanner
            tone="locked"
            message="Locked while pending Approver review. Viewing stays available; edits, uploads and deletions are disabled."
          />
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Submitted by" value={approval?.submitted_by} />
          <Fact label="Submitted at" value={formatDate(approval?.submitted_at)} />
          <Fact label="Decided by" value={approval?.decided_by} />
          <Fact label="Decided at" value={formatDate(approval?.decided_at)} />
        </dl>

        {editability.reason && !editability.isLocked ? (
          <p className="text-small text-subdued">{editability.reason}</p>
        ) : null}

        {submitBlockedReason && editability.canEdit ? (
          <p className="text-small text-draft-fg">{submitBlockedReason}</p>
        ) : null}

        {editability.canSubmit || editability.canDecide ? (
          <div className="flex flex-wrap justify-end gap-3">
            {editability.canSubmit ? (
              <button
                type="button"
                className="preview-button-primary"
                disabled={!canSubmit || isBusy}
                onClick={() => void controller.submit()}
              >
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
                Submit for approval
              </button>
            ) : null}

            {editability.canDecide ? (
              <>
                <button
                  type="button"
                  className="preview-button-danger"
                  disabled={isBusy}
                  onClick={() => setIsRejecting(true)}
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Reject
                </button>
                <button
                  type="button"
                  className="preview-button-primary"
                  disabled={isBusy}
                  onClick={() => void controller.decide("approved")}
                >
                  {isBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  )}
                  Approve
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {isRejecting ? (
        <Dialog
          title="Reject submission"
          busy={isBusy}
          size="md"
          onClose={() => {
            setIsRejecting(false);
            setReasonError(null);
          }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reject-reason" className="block text-sm font-semibold text-text">
                Reason for rejection
                <span className="ml-1 text-danger">*</span>
              </label>
              <textarea
                id="reject-reason"
                rows={4}
                value={reason}
                disabled={isBusy}
                aria-invalid={Boolean(reasonError)}
                className={`w-full rounded-control border bg-surface px-3 py-2 text-sm text-text shadow-sm transition placeholder:text-subdued/70 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted ${
                  reasonError ? "border-danger" : "border-border focus:border-primary"
                }`}
                placeholder="Explain what must be corrected before resubmission."
                onChange={(event) => {
                  setReason(event.target.value);
                  setReasonError(null);
                }}
              />
              <FormError message={reasonError ?? undefined} />
            </div>

            {error ? <MasterDataBanner tone="error" message={error} /> : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="preview-button-secondary"
                disabled={isBusy}
                onClick={() => setIsRejecting(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="preview-button-danger"
                disabled={isBusy}
                onClick={() => void reject()}
              >
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <XCircle className="size-4" aria-hidden="true" />
                )}
                Confirm rejection
              </button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-control bg-muted px-3 py-2">
      <dt className="text-micro font-semibold uppercase tracking-overline text-subdued">{label}</dt>
      <dd className="mt-1 text-small font-medium">{value || "-"}</dd>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
