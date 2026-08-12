import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { DocxPreview } from "../../format-preview/components/DocxPreview";
import type { PreviewDocument } from "../../format-preview/model/formatPreview.types";
import type { DocumentPreview } from "../api/masterData.types";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface DocumentViewerProps {
  document: DocumentPreview | null;
  documentKey: string;
  isLoading: boolean;
  error: string | null;
  /** Tailwind height for the render frame. */
  frameHeight?: string;
  emptyMessage?: string;
}

/**
 * PDFs render in an object frame, DOCX through the app's existing docx-preview
 * renderer, and anything else falls back to a download.
 */
export function DocumentViewer({
  document,
  documentKey,
  isLoading,
  error,
  frameHeight = "h-[70vh]",
  emptyMessage = "Select a document to preview it.",
}: DocumentViewerProps) {
  const [, setIsDocxReady] = useState(false);
  const onReadyChange = useCallback((ready: boolean) => setIsDocxReady(ready), []);

  const docxDocument = useMemo<PreviewDocument | null>(() => {
    if (!document || !isDocx(document.mimeType, document.filename)) {
      return null;
    }

    return {
      blob: document.blob,
      objectUrl: document.objectUrl,
      filename: document.filename,
      mimeType: document.mimeType,
      size: document.size,
      etag: null,
      lastModified: null,
      documentKey: `${documentKey}-${document.size}`,
      extractionWarnings: [],
      uploadedFilename: null,
    };
  }, [document, documentKey]);

  if (isLoading) {
    return (
      <div
        className={`flex ${frameHeight} flex-col items-center justify-center gap-3 rounded-card border border-border bg-muted`}
      >
        <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
        <p className="text-small text-subdued">Opening document…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex ${frameHeight} flex-col items-center justify-center gap-3 rounded-card border border-border bg-muted px-6 text-center`}
        role="alert"
      >
        <AlertTriangle className="size-9 text-danger" aria-hidden="true" />
        <h3 className="text-h3 font-semibold">Preview unavailable</h3>
        <p className="max-w-md text-small text-subdued">{error}</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div
        className={`flex ${frameHeight} items-center justify-center rounded-card border border-dashed border-border bg-muted px-6 text-center text-small text-subdued`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-control border border-border bg-muted px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-small font-medium">{document.filename}</span>
        {document.size ? (
          <span className="text-micro text-subdued">{formatSize(document.size)}</span>
        ) : null}
        <a
          href={document.objectUrl}
          download={document.filename}
          className="preview-button-secondary min-h-9 px-3"
        >
          <Download className="size-4" aria-hidden="true" />
          Download
        </a>
      </div>

      {isPdf(document.mimeType, document.filename) ? (
        <object
          data={document.objectUrl}
          type="application/pdf"
          className={`${frameHeight} w-full rounded-card border border-border bg-muted`}
          aria-label={`${document.filename} preview`}
        >
          <FallbackDownload url={document.objectUrl} filename={document.filename} />
        </object>
      ) : docxDocument ? (
        <div className="overflow-hidden rounded-card border border-border">
          <DocxPreview document={docxDocument} onReadyChange={onReadyChange} />
        </div>
      ) : (
        <FallbackDownload url={document.objectUrl} filename={document.filename} />
      )}
    </div>
  );
}

function FallbackDownload({ url, filename }: { url: string; filename: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-card border border-border bg-muted px-6 text-center">
      <AlertTriangle className="size-9 text-draft-fg" aria-hidden="true" />
      <h3 className="text-h3 font-semibold">This format cannot be shown in the browser</h3>
      <p className="max-w-md text-small text-subdued">
        Download the file to open it in its native application.
      </p>
      <a href={url} download={filename} className="preview-button-primary">
        <Download className="size-4" aria-hidden="true" />
        Download {filename}
      </a>
    </div>
  );
}

function isPdf(mimeType: string, filename: string) {
  return (
    mimeType.toLowerCase().startsWith("application/pdf") || filename.toLowerCase().endsWith(".pdf")
  );
}

function isDocx(mimeType: string, filename: string) {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  return normalized === DOCX_MIME || filename.toLowerCase().endsWith(".docx");
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
