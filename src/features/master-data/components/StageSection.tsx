import { CheckCircle2, ChevronDown, ChevronUp, FileUp, Loader2 } from "lucide-react";
import { useId, useState, type ChangeEvent } from "react";
import type { ChecklistSlot, OtherDocument, StageChecklist } from "../api/masterData.types";
import type { DocumentActionsController } from "../hooks/useDocumentActions";
import { DOCUMENT_ACCEPT, stageLabel } from "../model/masterData.config";
import { DocumentSlotCard } from "./DocumentSlotCard";

const MARKERS = "abcdefghijklmnopqrstuvwxyz";

export interface StageDocumentHandlers {
  onUploadSlot: (stageKey: string, slot: ChecklistSlot, file: File) => void;
  onRemoveSlot: (stageKey: string, slot: ChecklistSlot) => void;
  onPreviewSlot: (stageKey: string, slot: ChecklistSlot) => void;
  onHistorySlot: (stageKey: string, slot: ChecklistSlot) => void;
  onAddOther: (stageKey: string, file: File) => void;
  onReplaceOther: (stageKey: string, other: OtherDocument, file: File) => void;
  onRemoveOther: (stageKey: string, other: OtherDocument) => void;
  onPreviewOther: (stageKey: string, other: OtherDocument) => void;
  onHistoryOther: (stageKey: string, other: OtherDocument) => void;
  onRetry: (key: string) => void;
}

interface StageSectionProps {
  stage: StageChecklist;
  canEdit: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  actions: DocumentActionsController;
  handlers: StageDocumentHandlers;
}

export function StageSection({
  stage,
  canEdit,
  isExpanded,
  onToggle,
  actions,
  handlers,
}: StageSectionProps) {
  const slots = stage.slots ?? [];
  const others = stage.others ?? [];
  const uploaded = stage.uploaded_count ?? slots.filter((slot) => slot.uploaded).length;
  const required = stage.required_count ?? slots.filter((slot) => slot.required).length;
  const isComplete = required > 0 && uploaded >= required;
  const panelId = `stage-panel-${stage.stage_key}`;

  return (
    <article className="border-b border-border last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
        >
          <span className="mr-auto min-w-0">
            <span className="block text-small font-semibold text-text">
              {stageLabel(stage.stage_key)}
            </span>
            <span className="mt-0.5 block text-micro text-subdued">
              {slots.length} {slots.length === 1 ? "document" : "documents"}
              {others.length ? ` · ${others.length} other` : ""}
              {isComplete ? " · complete - files can still be replaced" : ""}
            </span>
          </span>

          {isComplete ? (
            <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
          ) : null}

          <span
            className={`shrink-0 rounded-pill px-2.5 py-1 font-mono text-mono-sm ${
              isComplete ? "bg-approved-bg text-approved-fg" : "bg-muted text-subdued"
            }`}
          >
            {uploaded} / {required} uploaded
          </span>

          {isExpanded ? (
            <ChevronUp className="size-4 shrink-0 text-subdued" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-subdued" aria-hidden="true" />
          )}
        </button>
      </h3>

      {isExpanded ? (
        <div id={panelId} className="space-y-3 border-t border-border bg-muted/30 px-5 py-4">
          {slots.length === 0 ? (
            <p className="rounded-control border border-dashed border-border bg-surface px-4 py-3 text-small text-subdued">
              No checklist documents are configured for this stage.
            </p>
          ) : (
            slots.map((slot, index) => {
              const key = slotKey(stage.stage_key, slot.code);

              return (
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
                  canEdit={canEdit}
                  action={actions.stateFor(key)}
                  onUpload={(file) => handlers.onUploadSlot(stage.stage_key, slot, file)}
                  onRemove={() => handlers.onRemoveSlot(stage.stage_key, slot)}
                  onPreview={() => handlers.onPreviewSlot(stage.stage_key, slot)}
                  onHistory={() => handlers.onHistorySlot(stage.stage_key, slot)}
                  onRetry={actions.canRetry(key) ? () => handlers.onRetry(key) : undefined}
                />
              );
            })
          )}

          {others.length ? (
            <div className="space-y-3 pt-2">
              <p className="text-micro font-semibold uppercase tracking-overline text-subdued">
                Other documents
              </p>
              {others.map((other) => {
                const key = otherKey(stage.stage_key, other.id);

                return (
                  <DocumentSlotCard
                    key={other.id}
                    label={other.label}
                    uploaded
                    fileName={other.file_name}
                    uploadedBy={other.uploaded_by}
                    uploadedAt={other.uploaded_at}
                    canEdit={canEdit}
                    action={actions.stateFor(key)}
                    onUpload={(file) => handlers.onReplaceOther(stage.stage_key, other, file)}
                    onRemove={() => handlers.onRemoveOther(stage.stage_key, other)}
                    onPreview={() => handlers.onPreviewOther(stage.stage_key, other)}
                    onHistory={() => handlers.onHistoryOther(stage.stage_key, other)}
                    onRetry={actions.canRetry(key) ? () => handlers.onRetry(key) : undefined}
                  />
                );
              })}
            </div>
          ) : null}

          {canEdit ? (
            <AddOtherDocument
              stageKey={stage.stage_key}
              action={actions.stateFor(addOtherKey(stage.stage_key))}
              onAdd={(file) => handlers.onAddOther(stage.stage_key, file)}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function AddOtherDocument({
  stageKey,
  action,
  onAdd,
}: {
  stageKey: string;
  action: ReturnType<DocumentActionsController["stateFor"]>;
  onAdd: (file: File) => void;
}) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const isBusy = action.status === "busy";

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      onAdd(file);
    }
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed px-4 py-3 text-small transition ${
          isDragging ? "border-primary/60 bg-accent-soft/40" : "border-border bg-surface"
        } ${isBusy ? "cursor-not-allowed opacity-70" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !isBusy) {
            onAdd(file);
          }
        }}
      >
        {isBusy ? (
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        ) : (
          <FileUp className="size-4 text-subdued" aria-hidden="true" />
        )}
        <span className="font-semibold text-primary-dark">Add other document</span>
        <span className="text-subdued">- optional, the file name becomes its label</span>
        <input
          id={inputId}
          type="file"
          accept={DOCUMENT_ACCEPT}
          className="sr-only"
          disabled={isBusy}
          aria-label={`Add another document to ${stageLabel(stageKey)}`}
          onChange={handleChange}
        />
      </label>

      {action.error ? (
        <p className="mt-2 rounded-control border border-danger/25 bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
          {action.error}
        </p>
      ) : null}
    </div>
  );
}

export function slotKey(stageKey: string, docCode: string) {
  return `${stageKey}::${docCode}`;
}

export function otherKey(stageKey: string, otherId: number) {
  return `${stageKey}::other::${otherId}`;
}

export function addOtherKey(stageKey: string) {
  return `${stageKey}::other::new`;
}
