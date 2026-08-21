import { AlertTriangle, ArrowRight, Inbox } from "lucide-react";
import type { DashboardDocument } from "../api/dashboard.types";
import { formatDashboardDate, statusBadgeClasses, statusLabel } from "../model/dashboard.presentation";

interface DashboardDocumentsTableProps {
  documents: DashboardDocument[];
  isLoading: boolean;
  /** Label of the selected card, if any - makes the empty state read as "no Draft documents" instead of a generic message. */
  emptyContext?: string;
  onOpen: (document: DashboardDocument) => void;
}

export function DashboardDocumentsTable({
  documents,
  isLoading,
  emptyContext,
  onOpen,
}: DashboardDocumentsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-control bg-muted" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-muted text-subdued">
          <Inbox className="size-5" aria-hidden="true" />
        </span>
        <p className="text-small font-semibold text-text">No documents found</p>
        <p className="max-w-sm text-small text-subdued">
          {emptyContext
            ? `There are no ${emptyContext.toLowerCase()} documents currently.`
            : "There are no documents in this status currently."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-small">
        <thead className="text-micro tracking-overline text-primary-dark border-b border-primary/25">
          <tr>
            <th scope="col" className="sticky top-0 z-10 border-b text-[12.5px] border-border bg-accent-soft px-4 py-4 font-semibold">
              BMR number
            </th>
            <th scope="col" className="sticky top-0 z-10 border-b text-[12.5px] border-border bg-accent-soft px-4 py-4 font-semibold">
              Product
            </th>
            <th scope="col" className="sticky top-0 z-10 border-b text-[12.5px] border-border bg-accent-soft px-4 py-4 font-semibold">
              Type
            </th>
            <th scope="col" className="sticky top-0 z-10 border-b text-[12.5px] border-border bg-accent-soft px-4 py-4 font-semibold">
              Status
            </th>
            <th scope="col" className="sticky top-0 z-10 border-b text-[12.5px] border-border bg-accent-soft px-4 py-4 font-semibold">
              Last modified
            </th>
            <th scope="col" className="sticky top-0 z-10 w-10 border-b border-border bg-accent-soft px-4 py-4">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {documents.map((document) => (
            <tr
              key={document.job_id}
              tabIndex={0}
              role="button"
              aria-label={`Open ${document.bmr_number || document.job_id}`}
              className="group cursor-pointer align-top transition-colors duration-150 hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
              onClick={() => onOpen(document)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(document);
                }
              }}
            >
              <td className="px-4 py-3.5 font-mono text-mono-sm font-medium text-text">
                {document.bmr_number || "—"}
              </td>
              <td className="max-w-[260px] px-4 py-3.5">
                <p className="truncate font-semibold text-text" title={document.product_name || undefined}>
                  {document.product_name || "—"}
                </p>
                <p className="mt-0.5 truncate text-micro text-subdued" title={document.product_code || undefined}>
                  {document.product_code || "—"}
                </p>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {document.product_type ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-micro text-subdued">
                      {document.product_type}
                    </span>
                  ) : null}
                  {document.batch_type ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-micro text-subdued">
                      {document.batch_type}
                    </span>
                  ) : null}
                  {!document.product_type && !document.batch_type ? (
                    <span className="text-micro text-subdued">—</span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex flex-col items-start gap-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-micro font-semibold ${statusBadgeClasses(document)}`}
                  >
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {statusLabel(document)}
                  </span>
                  {document.status_since ? (
                    <span className="text-micro text-subdued">
                      Since {formatDashboardDate(document.status_since)}
                    </span>
                  ) : null}
                  {document.is_overdue ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-danger-soft px-2 py-0.5 text-micro font-semibold text-danger-ink">
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      Overdue
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3.5 text-subdued">{formatDashboardDate(document.last_modified_at)}</td>
              <td className="px-4 py-3.5 text-subdued">
                <ArrowRight
                  className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
