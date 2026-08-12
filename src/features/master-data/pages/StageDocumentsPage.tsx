import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getBatchDocumentsRoute,
  MASTER_DATA_ROUTES,
} from "../../../app/routing/routes";
import { PreviewStateCard } from "../../format-preview/components/PreviewStateCard";
import { useAuthStore } from "../../auth/state/auth.store";
import type { ChecklistSlot, MasterDataScope, OtherDocument } from "../api/masterData.types";
import {
  decideStageDocumentsApproval,
  getOtherStageDocumentHistory,
  getStageDocumentHistory,
  getStageDocumentsApproval,
  previewOtherStageDocument,
  previewStageDocument,
  removeOtherStageDocument,
  removeStageDocument,
  replaceOtherStageDocument,
  saveOtherStageDocument,
  saveStageDocument,
  submitStageDocumentsApproval,
} from "../api/stageDocuments.api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DocumentHistoryDialog, type HistoryTarget } from "../components/DocumentHistoryDialog";
import { DocumentPreviewDialog } from "../components/DocumentPreviewDialog";
import { MasterDataBanner } from "../components/MasterDataBanner";
import { MasterDataShell } from "../components/MasterDataShell";
import {
  addOtherKey,
  otherKey,
  slotKey,
  StageSection,
  type StageDocumentHandlers,
} from "../components/StageSection";
import { useApproval } from "../hooks/useApproval";
import { useDocumentActions } from "../hooks/useDocumentActions";
import { useDocumentPreview } from "../hooks/useDocumentPreview";
import { useStageChecklist } from "../hooks/useStageChecklist";
import { MASTER_DATA_STEPS, scopeLabel, stageLabel, validateDocumentFile } from "../model/masterData.config";
import { getEditability, getMasterDataPermissions } from "../model/masterData.permissions";

type DeleteTarget =
  | { kind: "slot"; stageKey: string; slot: ChecklistSlot }
  | { kind: "other"; stageKey: string; other: OtherDocument };

export function StageDocumentsPage() {
  const { productType = "", docType = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const permissions = useMemo(() => getMasterDataPermissions(user?.role), [user?.role]);
  const scope = useMemo<MasterDataScope>(() => ({ productType, docType }), [docType, productType]);

  const checklist = useStageChecklist(scope);
  const actions = useDocumentActions();
  const preview = useDocumentPreview();
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLockedByServer, setIsLockedByServer] = useState(false);

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
    void checklist.reload();
  }, [checklist]);

  const approval = useApproval(approvalApi, onApprovalChanged);
  const editability = getEditability({ permissions, approval: approval.approval, isLockedByServer });

  const runAction = useCallback(
    async (
      key: string,
      action: (onProgress: (percent: number) => void) => Promise<unknown>,
      fallback: string,
      stageKey: string,
    ) => {
      const result = await actions.run(key, action, fallback);

      if (result.ok) {
        await checklist.refreshStage(stageKey);
        // Editing an approved set restarts its review cycle, so re-read the status.
        void approval.reload();
      } else if (result.error?.kind === "locked") {
        setIsLockedByServer(true);
      }

      return result;
    },
    [actions, approval, checklist],
  );

  const handlers = useMemo<StageDocumentHandlers>(
    () => ({
      onUploadSlot(stageKey, slot, file) {
        const key = slotKey(stageKey, slot.code);
        const validationError = validateDocumentFile(file);

        if (validationError) {
          actions.fail(key, validationError);
          return;
        }

        void runAction(
          key,
          (onProgress) => saveStageDocument(scope, stageKey, slot.code, file, onProgress),
          `Unable to upload ${slot.label}.`,
          stageKey,
        );
      },
      onRemoveSlot(stageKey, slot) {
        setDeleteError(null);
        setDeleteTarget({ kind: "slot", stageKey, slot });
      },
      onPreviewSlot(stageKey, slot) {
        preview.open({
          key: slotKey(stageKey, slot.code),
          title: `${slot.label} - ${stageLabel(stageKey)}`,
          load: (signal) => previewStageDocument(scope, stageKey, slot.code, signal),
        });
      },
      onHistorySlot(stageKey, slot) {
        setHistoryTarget({
          key: slotKey(stageKey, slot.code),
          title: slot.label,
          load: (signal) => getStageDocumentHistory(scope, stageKey, slot.code, signal),
        });
      },
      onAddOther(stageKey, file) {
        const key = addOtherKey(stageKey);
        const validationError = validateDocumentFile(file);

        if (validationError) {
          actions.fail(key, validationError);
          return;
        }

        void runAction(
          key,
          (onProgress) => saveOtherStageDocument(scope, stageKey, file, onProgress),
          "Unable to add this document.",
          stageKey,
        );
      },
      onReplaceOther(stageKey, other, file) {
        const key = otherKey(stageKey, other.id);
        const validationError = validateDocumentFile(file);

        if (validationError) {
          actions.fail(key, validationError);
          return;
        }

        void runAction(
          key,
          (onProgress) => replaceOtherStageDocument(scope, stageKey, other.id, file, onProgress),
          `Unable to replace ${other.label}.`,
          stageKey,
        );
      },
      onRemoveOther(stageKey, other) {
        setDeleteError(null);
        setDeleteTarget({ kind: "other", stageKey, other });
      },
      onPreviewOther(stageKey, other) {
        preview.open({
          key: otherKey(stageKey, other.id),
          title: `${other.label} - ${stageLabel(stageKey)}`,
          load: (signal) => previewOtherStageDocument(scope, stageKey, other.id, signal),
        });
      },
      onHistoryOther(stageKey, other) {
        setHistoryTarget({
          key: otherKey(stageKey, other.id),
          title: other.label,
          load: (signal) => getOtherStageDocumentHistory(scope, stageKey, other.id, signal),
        });
      },
      onRetry(key) {
        void actions.retry(key);
      },
    }),
    [actions, preview, runAction, scope],
  );

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    const { stageKey } = deleteTarget;
    const key =
      deleteTarget.kind === "slot"
        ? slotKey(stageKey, deleteTarget.slot.code)
        : otherKey(stageKey, deleteTarget.other.id);

    const result = await runAction(
      key,
      () =>
        deleteTarget.kind === "slot"
          ? removeStageDocument(scope, stageKey, deleteTarget.slot.code)
          : removeOtherStageDocument(scope, stageKey, deleteTarget.other.id),
      "Unable to remove this document.",
      stageKey,
    );

    setIsDeleting(false);

    if (result.ok) {
      setDeleteTarget(null);
      actions.clear(key);
    } else {
      setDeleteError(result.error?.message ?? "Unable to remove this document.");
    }
  }

  if (!productType || !docType) {
    return (
      <MasterDataShell title="Master data" heading="Stage documents">
        <PreviewStateCard
          icon={AlertCircle}
          title="No document set selected"
          message="Choose a product type and document type to continue."
          tone="warning"
          actions={
            <button
              type="button"
              className="preview-button-primary"
              onClick={() => navigate(MASTER_DATA_ROUTES.types)}
            >
              Back to types
            </button>
          }
        />
      </MasterDataShell>
    );
  }

  const isComplete = checklist.requiredCount > 0 && checklist.uploadedCount >= checklist.requiredCount;

  return (
    <MasterDataShell
      title="Master data"
      heading="Stage documents"
      eyebrow="Step 2 of 4"
      description="Upload the blank approved master format for each document listed below - not a filled batch record."
      crumbs={[
        { label: "Master data", to: MASTER_DATA_ROUTES.hub },
        { label: "Types", to: MASTER_DATA_ROUTES.types },
        { label: scopeLabel(scope), to: MASTER_DATA_ROUTES.types },
        { label: "Stage documents" },
      ]}
      steps={MASTER_DATA_STEPS}
      activeStepId="stage-documents"
    >
      <div className="space-y-5">
        {checklist.error ? (
          <MasterDataBanner
            tone="error"
            message={checklist.error}
            actions={
              <button
                type="button"
                className="preview-button-secondary min-h-8 px-3"
                onClick={() => void checklist.reload()}
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
              <h2 className="text-h3 font-semibold">Stages - {scopeLabel(scope)}</h2>
              <p className="mt-1 text-small text-subdued">
                {checklist.stages.length} {checklist.stages.length === 1 ? "section" : "sections"} ·{" "}
                {checklist.requiredCount} mandatory {checklist.requiredCount === 1 ? "document" : "documents"}
              </p>
            </div>
            <span
              className={`rounded-pill px-3 py-1 font-mono text-mono-sm ${
                isComplete ? "bg-approved-bg text-approved-fg" : "bg-muted text-subdued"
              }`}
            >
              {checklist.uploadedCount} / {checklist.requiredCount} uploaded
            </span>
            {/* {checklist.stages.length ? (
              <button
                type="button"
                className="preview-button-secondary min-h-9 px-3"
                onClick={() => setExpanded(expanded ? null : (checklist.stages[0]?.stage_key ?? null))}
              >
                {expanded ? "Collapse" : "Expand first stage"}
              </button>
            ) : null} */}
          </div>

          {checklist.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-control bg-muted" />
              ))}
            </div>
          ) : checklist.stages.length === 0 ? (
            <p className="px-5 py-12 text-center text-small text-subdued">
              No stages are configured for {scopeLabel(scope)}.
            </p>
          ) : (
            <div>
              {checklist.stages.map((stage) => (
                <StageSection
                  key={stage.stage_key}
                  stage={stage}
                  canEdit={editability.canEdit}
                  isExpanded={expanded === stage.stage_key}
                  onToggle={() =>
                    setExpanded((current) => (current === stage.stage_key ? null : stage.stage_key))
                  }
                  actions={actions}
                  handlers={handlers}
                />
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="preview-button-secondary"
            onClick={() => navigate(MASTER_DATA_ROUTES.types)}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to types
          </button>
          <button
            type="button"
            className="preview-button-primary"
            onClick={() => navigate(getBatchDocumentsRoute(scope))}
          >
            Continue to batch documents
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <DocumentPreviewDialog controller={preview} />
      <DocumentHistoryDialog target={historyTarget} onClose={() => setHistoryTarget(null)} />

      {deleteTarget ? (
        <ConfirmDialog
          title="Remove document"
          message={`Remove “${
            deleteTarget.kind === "slot" ? deleteTarget.slot.label : deleteTarget.other.label
          }”? The slot goes back to its empty upload box - the previous file stays in the audit trail.`}
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
