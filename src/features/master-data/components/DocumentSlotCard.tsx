import { AlertCircle, Eye, FileText, FileUp, History, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useId, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import type { DocumentActionState } from "../hooks/useDocumentActions";
import { DOCUMENT_ACCEPT } from "../model/masterData.config";

interface DocumentSlotCardProps {
  label: string;
  code?: string | null;
  required?: boolean;
  uploaded: boolean;
  fileName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  /** Ordinal marker (a, b, c …) matching the checklist reading order. */
  marker?: string;
  canEdit: boolean;
  action: DocumentActionState;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  onPreview?: () => void;
  onHistory?: () => void;
  onRetry?: () => void;
}

export function DocumentSlotCard({
  label,
  code,
  required = false,
  uploaded,
  fileName,
  uploadedBy,
  uploadedAt,
  marker,
  canEdit,
  action,
  onUpload,
  onRemove,
  onPreview,
  onHistory,
  onRetry,
}: DocumentSlotCardProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const isBusy = action.status === "busy";
  const isDisabled = !canEdit || isBusy;

  function pick(file: File | null | undefined) {
    if (file && !isDisabled) {
      onUpload(file);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    pick(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    pick(event.dataTransfer.files?.[0]);
  }

  return (
    <article className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        {marker ? (
          <span
            className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-micro font-semibold text-subdued"
            aria-hidden="true"
          >
            {marker}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-small font-semibold text-text">
            {label}
            {required ? <span className="ml-1 text-danger">*</span> : null}
          </p>
          <p className="mt-0.5 text-micro text-subdued">
            {code ? <span className="font-mono">{code}</span> : null}
            {code ? " · " : null}
            {required ? "Required" : "Optional"}
          </p>
        </div>

        {uploaded && !isBusy ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {onPreview ? (
              <SlotAction label={`Preview ${label}`} icon={<Eye />} onClick={onPreview} />
            ) : null}
            {onHistory ? (
              <SlotAction label={`History for ${label}`} icon={<History />} onClick={onHistory} />
            ) : null}
            {canEdit ? (
              <>
                <label
                  htmlFor={inputId}
                  title={`Replace ${label}`}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-control text-subdued transition hover:bg-muted hover:text-text"
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  <span className="sr-only">Replace {label}</span>
                </label>
                {onRemove ? (
                  <SlotAction label={`Remove ${label}`} icon={<Trash2 />} danger onClick={onRemove} />
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <input
        id={inputId}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        disabled={isDisabled}
        onChange={handleChange}
      />

      <div className="mt-3">
        {isBusy ? (
          <div className="rounded-control border border-primary/40 bg-accent-soft/30 p-3">
            <span className="flex items-center gap-3">
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-small font-medium text-text">Uploading…</span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(8, action.progress))}%` }}
                  />
                </span>
              </span>
            </span>
          </div>
        ) : uploaded ? (
          <div className="flex items-center gap-3 rounded-control border border-border bg-muted/60 p-3">
            <FileText className="size-4 shrink-0 text-subdued" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small font-medium text-text">
                {fileName ?? "Uploaded document"}
              </span>
              <span className="mt-0.5 block text-micro text-subdued">
                {[uploadedBy, formatDate(uploadedAt)].filter(Boolean).join(" · ") || "Uploaded"}
              </span>
            </span>
          </div>
        ) : canEdit ? (
          <label
            htmlFor={inputId}
            className={`block cursor-pointer rounded-control border border-dashed p-5 text-center transition ${
              isDragging ? "border-primary/60 bg-accent-soft/30" : "border-border bg-muted"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <span className="flex flex-col items-center gap-2">
              <FileUp className="size-5 text-subdued" aria-hidden="true" />
              <span className="text-small text-subdued">
                Drag &amp; drop or <span className="font-semibold text-primary-dark">browse files</span>
              </span>
              <span className="text-micro text-subdued">PDF or DOCX · max 25 MB · one file</span>
            </span>
          </label>
        ) : (
          <p className="rounded-control border border-dashed border-border bg-muted px-4 py-3 text-small text-subdued">
            Not uploaded yet.
          </p>
        )}

        {action.error ? (
          <div
            className="mt-2 flex flex-wrap items-start gap-2 rounded-control border border-danger/25 bg-danger-soft px-3 py-2 text-small text-danger-ink"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{action.error}</span>
            {onRetry ? (
              <button
                type="button"
                className="shrink-0 font-semibold underline underline-offset-2"
                onClick={onRetry}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SlotAction({
  label,
  icon,
  danger,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-control transition focus:outline-none focus:ring-2 focus:ring-primary ${
        danger ? "text-danger hover:bg-danger-soft" : "text-subdued hover:bg-muted hover:text-text"
      }`}
    >
      <span className="[&>svg]:size-4">{icon}</span>
    </button>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
