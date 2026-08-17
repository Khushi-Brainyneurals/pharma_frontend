import { Trash2 } from "lucide-react";
import type { EquipmentListItem } from "../types/stages.types";

interface EquipmentRowCardProps {
  item: EquipmentListItem;
  disabled?: boolean;
  onRemove: () => void;
}

/** One already-added equipment entry, shown in the running list below the add form. */
export function EquipmentRowCard({ item, disabled = false, onRemove }: EquipmentRowCardProps) {
  const cppEntries = Object.entries(item.cpp_values).filter(([, value]) => value.trim() !== "");

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-control border border-border bg-surface px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-small font-semibold text-text">{item.name}</span>
          <span className="rounded-pill bg-muted px-2 py-0.5 font-mono text-mono-sm text-subdued">
            {item.id}
          </span>
          <span className="rounded-pill bg-muted px-2 py-0.5 text-micro text-subdued">
            Lot {item.lot}
          </span>
        </div>
        {item.processing_step ? (
          <p className="text-micro text-subdued">
            Processing step: <span className="font-medium text-text">{item.processing_step}</span>
          </p>
        ) : null}
        {cppEntries.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {cppEntries.map(([name, value]) => (
              <span
                key={name}
                className="rounded-control bg-muted px-2 py-0.5 font-mono text-mono-sm text-subdued"
              >
                {name}: {value}
              </span>
            ))}
          </div>
        ) : null}
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
