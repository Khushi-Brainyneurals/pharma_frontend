import { Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Loader2, Lock } from "lucide-react";

interface StageAccordionProps {
  /** 1-based ordinal number, always shown to the left of the checkbox. */
  ordinal: number;
  stageId: string;
  stageName: string;
  /** Whether this stage has been picked for the document - independent of whether its params are saved. */
  isSelected: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isSaved: boolean;
  isRequired?: boolean;
  /** Suppress the toggle/expand controls while a global save is running */
  globalDisabled?: boolean;
  /** Selects/deselects the stage - the number/check button. */
  onToggleSelect: () => void;
  /** Expands/collapses the stage configuration panel - only meaningful while selected. */
  onToggleExpand: () => void;
  /** Content rendered inside when expanded */
  children?: React.ReactNode;
}

/**
 * Accordion row for a single manufacturing stage.
 *
 * Visual structure:
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ 01 [✓] Dispensing of Raw Material    [Params pending] [REQUIRED] [^] │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │  <ParameterPanel>                                                    │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * - The checkbox selects/deselects the stage; it never expands the row.
 * - A stage only expands once it is selected - clicking the header row (or the
 *   chevron) while unselected does nothing.
 * - Left teal border indicates the expanded / active stage.
 */
export function StageAccordion({
  ordinal,
  stageId,
  stageName,
  isSelected,
  isExpanded,
  isLoading,
  isSaving,
  isSaved,
  isRequired = false,
  globalDisabled = false,
  onToggleSelect,
  onToggleExpand,
  children,
}: StageAccordionProps) {
  const canExpand = isSelected && !globalDisabled && !isLoading;

  function handleHeaderClick(e: React.MouseEvent) {
    // Prevent the header click from bubbling to avoid double-firing
    // when parameter controls inside the panel are clicked.
    e.stopPropagation();
    if (canExpand) onToggleExpand();
  }

  return (
    <article
      id={`stage-${stageId}`}
      className={`relative border-b border-border transition-colors last:border-b-0 ${
        isExpanded ? "bg-surface" : "bg-surface hover:bg-muted/30"
      }`}
    >
      {/* Left active indicator bar */}
      <div
        className={`absolute inset-y-0 left-0 w-1 rounded-l transition-all ${
          isExpanded ? "bg-primary" : "bg-transparent"
        }`}
        aria-hidden="true"
      />

      {/* ── Header row ── */}
      <div
        id={`stage-header-${stageId}`}
        className="flex w-full items-center gap-3 pl-5 pr-3 py-0"
        style={{ minHeight: 56 }}
      >
        {/* Ordinal number - static label, always visible */}
        <span className="w-5 shrink-0 text-left font-mono text-mono-sm text-subdued">
          {String(ordinal).padStart(2, "0")}
        </span>

        {/* Checkbox - selects/deselects the stage. Same checkbox pattern as ParameterCard. */}
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={isSelected ? `Remove ${stageName} from this BMR` : `Include ${stageName} in this BMR`}
          disabled={globalDisabled || isLoading}
          className={`inline-flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isSelected ? "border-primary bg-primary text-white" : "border-border bg-surface"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (!globalDisabled && !isLoading) onToggleSelect();
          }}
        >
          {isSelected ? (
            <Check className="size-3" strokeWidth="3"/>
          ) : null}
        </button>

        {/* Header button - expands only once selected */}
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={`stage-panel-${stageId}`}
          disabled={!canExpand}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-default"
          onClick={handleHeaderClick}
        >
          {/* Stage name */}
          <span className={`min-w-0 flex-1 truncate text-small font-semibold ${isSelected ? "text-text" : "text-subdued"}`}>
            {stageName}
          </span>
        </button>

        {/* ── Status badges ── */}
        <div
          className="flex shrink-0 items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Params pending / saved badge - only meaningful once the stage is selected */}
          {isSelected ? (
            isSaved ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-approved-fg/30 bg-approved-bg px-2.5 py-1 text-micro font-semibold text-approved-fg">
                <CheckCircle2 className="size-3.5" />
                Parameters saved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-draft-fg/30 bg-draft-bg px-2.5 py-1 text-micro font-semibold text-draft-fg">
                <Clock className="size-3.5" />
                Params pending
              </span>
            )
          ) : null}

          {/* Required badge */}
          {isRequired ? (
            <span className="inline-flex items-center gap-1 rounded-pill border border-border bg-muted px-2.5 py-1 text-micro font-semibold uppercase tracking-overline text-subdued">
              <Lock className="size-3" />
              Required
            </span>
          ) : null}
        </div>

        {/* Expand / collapse chevron */}
        <button
          type="button"
          aria-label={isExpanded ? `Collapse ${stageName}` : `Expand ${stageName}`}
          disabled={!canExpand}
          tabIndex={-1} /* header button handles focus */
          className="ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border text-subdued transition-colors hover:bg-muted disabled:opacity-40"
          onClick={(e) => {
            e.stopPropagation();
            if (canExpand) onToggleExpand();
          }}
        >
          {isLoading || isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      </div>

      {/* ── Expanded panel ── */}
      {isExpanded ? (
        <div id={`stage-panel-${stageId}`} role="region" aria-labelledby={`stage-header-${stageId}`}>
          {children}
        </div>
      ) : null}
    </article>
  );
}
