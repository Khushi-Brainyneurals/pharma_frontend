import { Trash2 } from "lucide-react";
import type { InstrumentListItem } from "../types/stages.types";

interface InstrumentRowCardProps {
  item: InstrumentListItem;
  disabled?: boolean;
  onRemove: () => void;
}

/** One already-added instrument entry, shown in the running list below the add form. */
export function InstrumentRowCard({ item, disabled = false, onRemove }: InstrumentRowCardProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-control border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="text-small font-semibold text-text">{item.name}</span>
        <span className="rounded-pill bg-muted px-2 py-0.5 font-mono text-mono-sm text-subdued">
          {item.id}
        </span>
        <span className="rounded-pill bg-muted px-2 py-0.5 text-micro text-subdued">Lot {item.lot}</span>
      </div>

      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        disabled={disabled}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-control text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
