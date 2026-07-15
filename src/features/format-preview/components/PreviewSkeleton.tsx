import { Loader2 } from "lucide-react";

export function PreviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[820px]">
      <div
        className="relative min-h-[540px] overflow-hidden rounded-sm border border-border bg-white shadow-overlay"
        role="status"
        aria-live="polite"
        aria-label="Generating Page-1 preview"
      >
        <div className="h-10 bg-muted" />
        <div className="space-y-6 p-8 sm:p-12">
          <div className="flex items-center gap-4 border-b-2 border-muted pb-5">
            <div className="size-16 animate-pulse rounded-card bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((value) => <div key={value} className="h-10 animate-pulse rounded-control bg-muted" />)}
          </div>
          <div className="space-y-3">
            <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
            {[0, 1, 2, 3, 4].map((value) => <div key={value} className="h-8 animate-pulse rounded bg-muted" />)}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70">
          <Loader2 className="size-9 animate-spin text-primary" aria-hidden="true" />
          <p className="text-small font-medium text-subdued">Generating Page 1 from your MFC…</p>
        </div>
      </div>
    </div>
  );
}
