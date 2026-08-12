import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMasterDataPreviewRoute,
  getStageDocumentsRoute,
  MASTER_DATA_ROUTES,
} from "../../../app/routing/routes";
import { useAuthStore } from "../../auth/state/auth.store";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { ChecklistSlot, MasterDataScope, OtherDocumentsChecklist } from "../api/masterData.types";
import {
  decideStageDocumentsApproval,
  getOtherDocumentHistory,
  getOtherDocumentsChecklist,
  getStageDocumentsApproval,
  previewOtherDocument,
  removeOtherDocument,
  saveOtherDocument,
  submitStageDocumentsApproval,
} from "../api/stageDocuments.api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DocumentHistoryDialog, type HistoryTarget } from "../components/DocumentHistoryDialog";
import { DocumentPreviewDialog } from "../components/DocumentPreviewDialog";
import { DocumentSlotCard } from "../components/DocumentSlotCard";
import { MasterDataBanner } from "../components/MasterDataBanner";
import { MasterDataShell } from "../components/MasterDataShell";
import { useApproval } from "../hooks/useApproval";
import { useDocumentActions } from "../hooks/useDocumentActions";
import { useDocumentPreview } from "../hooks/useDocumentPreview";
import { MASTER_DATA_STEPS, scopeLabel, validateDocumentFile } from "../model/masterData.config";
import { getEditability, getMasterDataPermissions } from "../model/masterData.permissions";

const MARKERS = "abcdefghijklmnopqrstuvwxyz";

export function BatchDocumentsPage() {
  const { productType = "", docType = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const permissions = useMemo(() => getMasterDataPermissions(user?.role), [user?.role]);
  const scope = useMemo<MasterDataScope>(() => ({ productType, docType }), [docType, productType]);

  const [checklist, setChecklist] = useState<OtherDocumentsChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLockedByServer, setIsLockedByServer] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChecklistSlot | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const actions = useDocumentActions();
  const preview = useDocumentPreview();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const next = await getOtherDocumentsChecklist(scope, signal);
        if (!signal?.aborted) {
          setChecklist(next);
          setError(null);
        }
      } catch (requestError) {
        if (signal?.aborted) {
          return;
        }
        const normalized = await normalizeMasterDataError(
          requestError,
          "Unable to load the batch document checklist.",
        );
        setError(normalized.message);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [scope],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const approvalApi = useMemo(
    () => ({
      load: (signal?: AbortSignal) => getStageDocumentsApproval(scope, signal),
      submit: () => submitStageDocumentsApproval(scope),
      decide: (decision: "approved" | "rejected", reason?: string) =>
        decideStageDocumentsApproval(scope, decision, reason),
    }),
    [scope],
  );

  const onApprovalChanged = useCallback(() => {
    setIsLockedByServer(false);
    void load();
  }, [load]);

  const approval = useApproval(approvalApi, onApprovalChanged);
  const editability = getEditability({ permissions, approval: approval.approval, isLockedByServer });

  const runAction = useCallback(
    async (
      key: string,
      action: (onProgress: (percent: number) => void) => Promise<unknown>,
      fallback: string,
    ) => {
      const result = await actions.run(key, action, fallback);

      if (result.ok) {
        await load();
        // Editing an approved set restarts its review cycle, so re-read the status.
        void approval.reload();
      } else if (result.error?.kind === "locked") {
        setIsLockedByServer(true);
      }

      return result;
    },
    [actions, approval, load],
  );

  function upload(slot: ChecklistSlot, file: File) {
    const validationError = validateDocumentFile(file);

    if (validationError) {
      actions.fail(slot.code, validationError);
      return;
    }

    void runAction(
      slot.code,
      (onProgress) => saveOtherDocument(scope, slot.code, file, onProgress),
      `Unable to upload ${slot.label}.`,
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    const result = await runAction(
      deleteTarget.code,
      () => removeOtherDocument(scope, deleteTarget.code),
      "Unable to remove this document.",
    );

    setIsDeleting(false);

    if (result.ok) {
      actions.clear(deleteTarget.code);
      setDeleteTarget(null);
    } else {
      setDeleteError(result.error?.message ?? "Unable to remove this document.");
    }
  }

  const slots = checklist?.slots ?? [];
  const uploadedCount = checklist?.uploaded_count ?? slots.filter((slot) => slot.uploaded).length;
  const requiredCount = checklist?.required_count ?? slots.filter((slot) => slot.required).length;
  const isComplete = requiredCount > 0 && uploadedCount >= requiredCount;

  return (
    <MasterDataShell
      title="Master data"
      heading="Batch documents"
      eyebrow="Step 3 of 4"
      description="The closing sections that apply once per batch rather than per stage. Upload the blank approved master format for each."
      crumbs={[
        { label: "Master data", to: MASTER_DATA_ROUTES.hub },
        { label: "Types", to: MASTER_DATA_ROUTES.types },
        { label: scopeLabel(scope), to: getStageDocumentsRoute(scope) },
        { label: "Batch documents" },
      ]}
      steps={MASTER_DATA_STEPS}
      activeStepId="batch-documents"
    >
      <div className="space-y-5">
        {error ? (
          <MasterDataBanner
            tone="error"
            message={error}
            actions={
              <button
                type="button"
                className="preview-button-secondary min-h-8 px-3"
                onClick={() => void load()}
              >
                Retry
              </button>
            }
          />
        ) : null}

        {editability.reason ? <MasterDataBanner tone="locked" message={editability.reason} /> : null}

        <section className="rounded-panel border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <div className="mr-auto min-w-0">
              <h2 className="text-h3 font-semibold">Batch-level documents</h2>
              <p className="mt-1 text-small text-subdued">
                One file per document · PDF or DOCX · max 25 MB
              </p>
            </div>
            <span
              className={`rounded-pill px-3 py-1 font-mono text-mono-sm ${
                isComplete ? "bg-approved-bg text-approved-fg" : "bg-muted text-subdued"
              }`}
            >
              {uploadedCount} / {requiredCount} uploaded
            </span>
          </div>

          <div className="space-y-3 p-5">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-card bg-muted" />
              ))
            ) : slots.length === 0 ? (
              <p className="py-8 text-center text-small text-subdued">
                No batch-level documents are configured for {scopeLabel(scope)}.
              </p>
            ) : (
              slots.map((slot, index) => (
                <DocumentSlotCard
                  key={slot.code}
                  marker={MARKERS[index]}
                  label={slot.label}
                  code={slot.code}
                  required={slot.required}
                  uploaded={Boolean(slot.uploaded)}
                  fileName={slot.file_name}
                  uploadedBy={slot.uploaded_by}
                  uploadedAt={slot.uploaded_at}
                  canEdit={editability.canEdit}
                  action={actions.stateFor(slot.code)}
                  onUpload={(file) => upload(slot, file)}
                  onRemove={() => {
                    setDeleteError(null);
                    setDeleteTarget(slot);
                  }}
                  onPreview={() =>
                    preview.open({
                      key: slot.code,
                      title: slot.label,
                      load: (signal) => previewOtherDocument(scope, slot.code, signal),
                    })
                  }
                  onHistory={() =>
                    setHistoryTarget({
                      key: slot.code,
                      title: slot.label,
                      load: (signal) => getOtherDocumentHistory(scope, slot.code, signal),
                    })
                  }
                  onRetry={actions.canRetry(slot.code) ? () => void actions.retry(slot.code) : undefined}
                />
              ))
            )}
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="preview-button-secondary"
            onClick={() => navigate(getStageDocumentsRoute(scope))}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to stage documents
          </button>
          <button
            type="button"
            className="preview-button-primary"
            onClick={() => navigate(getMasterDataPreviewRoute(scope))}
          >
            Continue to preview
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <DocumentPreviewDialog controller={preview} />
      <DocumentHistoryDialog target={historyTarget} onClose={() => setHistoryTarget(null)} />

      {deleteTarget ? (
        <ConfirmDialog
          title="Remove document"
          message={`Remove “${deleteTarget.label}”? The slot goes back to its empty upload box - the previous file stays in the audit trail.`}
          confirmLabel="Remove document"
          busy={isDeleting}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        />
      ) : null}
    </MasterDataShell>
  );
}
