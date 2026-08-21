import { Check, Loader2 } from "lucide-react";

interface YieldLimitPanelProps {
  stageId: string;
  stageName: string;
  yieldLimit: string;
  isSaving: boolean;
  onYieldLimitChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * The expanded panel for `batch_yield_reconciliation` - the final stage.
 * Unlike every other stage, it has no parameters, equipment, or instrument
 * selection; its only field is Yield Limit, posted directly as
 * `{ yield_limit, user }`. See `isYieldReconciliationStage`.
 */
export function YieldLimitPanel({
  stageId,
  stageName,
  yieldLimit,
  isSaving,
  onYieldLimitChange,
  onCancel,
  onSave,
}: YieldLimitPanelProps) {
  const inputId = `yield-limit-${stageId}`;

  return (
    <div className="border-t border-border bg-background/40 px-5 py-5">
      {/* Heading */}
      {/* <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="text-small font-semibold text-text">
          Yield limit — <span className="text-text">{stageName}</span>
        </h3>
        <p className="ml-auto max-w-md text-right text-micro text-subdued">
          Enter the acceptable batch yield range for this stage.
        </p>
      </div> */}

      {/* Yield limit field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-small font-semibold text-text">
          Yield Limit
        </label>
        <input
          id={inputId}
          type="text"
          value={yieldLimit}
          disabled={isSaving}
          placeholder="e.g. 90.00 % to 100.00 %"
          className="h-9 w-full max-w-sm rounded-control border border-border bg-surface px-3 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          onChange={(e) => onYieldLimitChange(e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-end gap-2">
        <button type="button" disabled={isSaving} className="preview-button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving || !yieldLimit.trim()}
          className="preview-button-primary"
          onClick={onSave}
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Save
        </button>
      </div>
    </div>
  );
}
