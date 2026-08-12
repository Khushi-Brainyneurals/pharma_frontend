import { FileText, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog } from "../../../shared/ui/Dialog";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { DocumentHistoryEntry } from "../api/masterData.types";
import { MasterDataBanner } from "./MasterDataBanner";

export interface HistoryTarget {
  key: string;
  title: string;
  load: (signal?: AbortSignal) => Promise<DocumentHistoryEntry[]>;
}

interface DocumentHistoryDialogProps {
  target: HistoryTarget | null;
  onClose: () => void;
}

/** Newest first; a Remove is a row too, so nothing disappears from the trail. */
export function DocumentHistoryDialog({ target, onClose }: DocumentHistoryDialogProps) {
  const [entries, setEntries] = useState<DocumentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setError(null);
    setEntries([]);

    target
      .load(controller.signal)
      .then((rows) => active && setEntries(rows))
      .catch(async (requestError: unknown) => {
        if (!active) {
          return;
        }
        const normalized = await normalizeMasterDataError(
          requestError,
          "Unable to load this document's history.",
        );
        setError(normalized.message);
      })
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
      controller.abort();
    };
  }, [target]);

  if (!target) {
    return null;
  }

  return (
    <Dialog title={`History - ${target.title}`} onClose={onClose}>
      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center gap-3 text-small text-subdued">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          Loading history…
        </div>
      ) : error ? (
        <MasterDataBanner tone="error" message={error} />
      ) : entries.length === 0 ? (
        <p className="flex min-h-40 items-center justify-center text-small text-subdued">
          No history recorded for this document yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, index) => (
            <li
              key={`${entry.file_name}-${entry.uploaded_at ?? index}`}
              className="flex items-start gap-3 rounded-control border border-border p-3"
            >
              <span
                className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-control ${
                  entry.deleted ? "bg-danger-soft text-danger" : "bg-muted text-subdued"
                }`}
                aria-hidden="true"
              >
                {entry.deleted ? <Trash2 className="size-4" /> : <FileText className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium text-text">{entry.file_name}</p>
                <p className="mt-0.5 text-micro text-subdued">
                  {entry.deleted ? "Removed" : "Uploaded"}
                  {entry.uploaded_by ? ` by ${entry.uploaded_by}` : ""}
                  {entry.uploaded_at ? ` · ${formatDate(entry.uploaded_at)}` : ""}
                </p>
                {entry.label && entry.label !== entry.file_name ? (
                  <p className="mt-0.5 truncate text-micro text-subdued">{entry.label}</p>
                ) : null}
              </div>
              {index === 0 && !entry.deleted ? (
                <span className="shrink-0 rounded-pill bg-approved-bg px-2 py-1 text-micro font-semibold text-approved-fg">
                  Current
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
