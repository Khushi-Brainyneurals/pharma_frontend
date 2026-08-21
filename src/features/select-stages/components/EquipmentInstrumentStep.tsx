import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import type { EquipmentRow, InstrumentRow } from "../../master-data/api/masterData.types";
import { stageEquipmentHasProcessingStep } from "../config/stageParameters.config";
import type { EquipmentListItem, InstrumentListItem } from "../types/stages.types";
import { EquipmentRowCard } from "./EquipmentRowCard";
import { EquipmentSelection, type EquipmentSelectionHandle } from "./EquipmentSelection";
import { InstrumentRowCard } from "./InstrumentRowCard";
import { InstrumentSelection, type InstrumentSelectionHandle } from "./InstrumentSelection";

type SelectionMode = "equipment" | "instrument";

interface EquipmentInstrumentStepProps {
  stageKey: string;
  stageName: string;
  documentId: string;
  equipmentList: EquipmentListItem[];
  instrumentList: InstrumentListItem[];
  /** Already filtered to this stage - see `filterEquipmentForStage`. */
  equipmentMasters: EquipmentRow[];
  /** Already filtered to this stage - see `filterInstrumentsForStage`. */
  instrumentMasters: InstrumentRow[];
  isMastersLoading: boolean;
  mastersError: string | null;
  isSaving: boolean;
  onRetryMasters: () => void;
  onAddEquipment: (item: EquipmentListItem) => void;
  onRemoveEquipment: (index: number) => void;
  onAddInstrument: (item: InstrumentListItem) => void;
  onRemoveInstrument: (index: number) => void;
  onBack: () => void;
  onCancel: () => void;
  /**
   * Called when "Save and continue" is clicked. Receives whatever is
   * currently filled in on the visible form (equipment or instrument), even
   * if the user never clicked "Add equipment"/"Add instrument" - so a valid
   * in-progress draft is never silently dropped from the payload.
   */
  onSave: (pendingEquipment: EquipmentListItem | null, pendingInstrument: InstrumentListItem | null) => void;
}

/**
 * "Stage input" - the Equipment & Instrument screen for one stage, shown
 * inside the same accordion panel after "Save and Add Equipment and
 * Instrument" is clicked. Parameters entered on the previous screen are
 * untouched; this only adds `equipment_list` / `instrument_list` to the
 * stage's state before the final "Save and Continue" POST.
 *
 * Layout follows the PharmaDoc_StageInput reference: heading + subtitle,
 * an Equipment/Instrument mode toggle, and the selection/processing-stage/
 * CPP cards for whichever mode is active. Unlike the reference (which
 * composes exactly one equipment or instrument), this stage supports
 * multiple entries, so each mode also lists what has already been added.
 */
export function EquipmentInstrumentStep({
  stageKey,
  stageName,
  documentId,
  equipmentList,
  instrumentList,
  equipmentMasters,
  instrumentMasters,
  isMastersLoading,
  mastersError,
  isSaving,
  onRetryMasters,
  onAddEquipment,
  onRemoveEquipment,
  onAddInstrument,
  onRemoveInstrument,
  onBack,
  onCancel,
  onSave,
}: EquipmentInstrumentStepProps) {
  const [mode, setMode] = useState<SelectionMode>("equipment");
  const disabled = isSaving;
  const requiresProcessingStage = stageEquipmentHasProcessingStep(stageKey);
  const equipmentFormRef = useRef<EquipmentSelectionHandle>(null);
  const instrumentFormRef = useRef<InstrumentSelectionHandle>(null);

  function handleSaveClick() {
    const pendingEquipment = mode === "equipment" ? equipmentFormRef.current?.getPendingItem() ?? null : null;
    const pendingInstrument = mode === "instrument" ? instrumentFormRef.current?.getPendingItem() ?? null : null;
    onSave(pendingEquipment, pendingInstrument);
  }

  return (
    <div className="border-t border-border bg-background/40 px-5 py-5">
      {/* ── Page head ── */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-small font-semibold text-text">Stage input — {stageName}</h3>
          <p className="mt-0.5 max-w-md text-micro text-subdued">
            Choose equipment or an instrument for this stage. Its details load from the master.
          </p>
        </div>
        <span className="rounded-pill bg-accent-soft px-3 py-1 font-mono text-mono-sm text-primary-dark">
          {stageKey} · {documentId}
        </span>
      </div>

      {/* ── Equipment / Instrument toggle ── */}
      <div className="mb-4 inline-flex rounded-pill border border-border bg-muted p-1">
        <button
          type="button"
          aria-pressed={mode === "equipment"}
          className={`rounded-pill px-5 py-1.5 text-small font-semibold transition-colors ${
            mode === "equipment" ? "bg-primary text-white shadow-sm" : "text-subdued hover:text-text"
          }`}
          onClick={() => setMode("equipment")}
        >
          Equipment{equipmentList.length > 0 ? ` (${equipmentList.length})` : ""}
        </button>
        <button
          type="button"
          aria-pressed={mode === "instrument"}
          className={`rounded-pill px-5 py-1.5 text-small font-semibold transition-colors ${
            mode === "instrument" ? "bg-primary text-white shadow-sm" : "text-subdued hover:text-text"
          }`}
          onClick={() => setMode("instrument")}
        >
          Instrument{instrumentList.length > 0 ? ` (${instrumentList.length})` : ""}
        </button>
      </div>

      {mastersError ? (
        <div
          role="status"
          className="mb-4 flex items-start gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-small text-danger-ink"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{mastersError}</span>
          <button
            type="button"
            className="preview-button-secondary min-h-8 px-3"
            onClick={onRetryMasters}
          >
            Retry
          </button>
        </div>
      ) : null}

      {isMastersLoading ? (
        <div className="flex min-h-32 items-center justify-center gap-3 text-small text-subdued">
          <Loader2 className="size-5 animate-spin text-primary" />
          Loading equipment &amp; instrument master data…
        </div>
      ) : mastersError ? null : mode === "equipment" ? (
        <div className="space-y-3">
          <EquipmentSelection
            ref={equipmentFormRef}
            masters={equipmentMasters}
            disabled={disabled}
            requiresProcessingStage={requiresProcessingStage}
            onAdd={onAddEquipment}
          />
          {equipmentList.length > 0 ? (
            <div className="space-y-2">
              {equipmentList.map((item, index) => (
                <EquipmentRowCard
                  key={`${item.name}-${item.id}-${index}`}
                  item={item}
                  disabled={disabled}
                  onRemove={() => onRemoveEquipment(index)}
                />
              ))}
            </div>
          ) : (
            <p className="text-micro italic text-subdued">No equipment added yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <InstrumentSelection
            ref={instrumentFormRef}
            masters={instrumentMasters}
            disabled={disabled}
            includeLayer={!requiresProcessingStage}
            onAdd={onAddInstrument}
          />
          {instrumentList.length > 0 ? (
            <div className="space-y-2">
              {instrumentList.map((item, index) => (
                <InstrumentRowCard
                  key={`${item.name}-${item.id}-${index}`}
                  item={item}
                  disabled={disabled}
                  onRemove={() => onRemoveInstrument(index)}
                />
              ))}
            </div>
          ) : (
            <p className="text-micro italic text-subdued">No instrument added yet.</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <button type="button" disabled={isSaving} className="preview-button-secondary" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to parameters
        </button>
        <div className="flex items-center gap-2">
          <button type="button" disabled={isSaving} className="preview-button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" disabled={isSaving} className="preview-button-primary" onClick={handleSaveClick}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save and continue
          </button>
        </div>
      </div>
    </div>
  );
}
