import { ArrowRight, Loader2 } from "lucide-react";
import { getStageExtraFields, stageUsesLayerLotSize } from "../config/stageParameters.config";
import type { ParameterKind, ParameterMode, StageParameter } from "../types/stages.types";
import { LotSizeByLayerField } from "./LotSizeByLayerField";
import { ParameterCard } from "./ParameterCard";
import { StageExtraFieldsSection } from "./StageExtraFieldsSection";

interface ParameterPanelProps {
  stageId: string;
  stageName: string;
  documentId: string;
  parameters: StageParameter[];
  /** Stage-specific extra field values (e.g. `lot_size` for `dispensing_rm`). Empty object for stages with none. */
  extraFields: Record<string, string>;
  isSaving: boolean;
  onToggleEnabled: (paramIndex: number) => void;
  onModeChange: (paramIndex: number, mode: ParameterMode) => void;
  onKindChange: (paramIndex: number, kind: ParameterKind) => void;
  onMinChange: (paramIndex: number, value: string) => void;
  onMaxChange: (paramIndex: number, value: string) => void;
  onUnitChange: (paramIndex: number, value: string) => void;
  onValueChange: (paramIndex: number, value: string) => void;
  onExtraFieldChange: (fieldKey: string, value: string) => void;
  onCancel: () => void;
  /** Advances to the Equipment & Instrument screen - parameters are already persisted in local state. */
  onContinue: () => void;
}

/**
 * The expanded panel rendered inside an open stage accordion row.
 *
 * Shows:
 * - "In-process parameters — [Stage Name]" heading
 * - A ParameterCard per parameter
 * - Footer with active-parameter count + Cancel + Save buttons
 */
export function ParameterPanel({
  stageId,
  stageName,
  documentId,
  parameters,
  extraFields,
  isSaving,
  onToggleEnabled,
  onModeChange,
  onKindChange,
  onMinChange,
  onMaxChange,
  onUnitChange,
  onValueChange,
  onExtraFieldChange,
  onCancel,
  onContinue,
}: ParameterPanelProps) {
  const activeCount = parameters.filter((p) => p.enabled).length;
  const totalCount = parameters.length;
  const extraFieldDefs = getStageExtraFields(stageId);

  return (
    <div className="border-t border-border bg-background/40 px-5 py-5">
      {/* Heading */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="text-small font-semibold text-text">
          In-process parameters —{" "}
          <span className="text-text">{stageName}</span>
        </h3>
        <p className="ml-auto max-w-md text-right text-micro text-subdued">
          Tick the parameters this stage records; give MFC limits where they apply.
        </p>
      </div>

      {/* Parameter cards */}
      <div className="space-y-2">
        {parameters.map((parameter, index) => (
          <ParameterCard
            key={parameter.name}
            parameter={parameter}
            paramIndex={index}
            stageId={stageId}
            isSaving={isSaving}
            onToggleEnabled={() => onToggleEnabled(index)}
            onModeChange={(mode) => onModeChange(index, mode)}
            onKindChange={(kind) => onKindChange(index, kind)}
            onMinChange={(value) => onMinChange(index, value)}
            onMaxChange={(value) => onMaxChange(index, value)}
            onUnitChange={(value) => onUnitChange(index, value)}
            onValueChange={(value) => onValueChange(index, value)}
          />
        ))}
      </div>

      {/* dispensing_rm collects Lot Size per Cover BOM layer; every other stage with
          extra fields (e.g. dispensing_coating's Lot Size) uses the plain free-text
          section, which renders nothing for stages with none. */}
      {stageUsesLayerLotSize(stageId) ? (
        <LotSizeByLayerField
          documentId={documentId}
          value={extraFields.lot_size ?? ""}
          disabled={isSaving}
          onChange={(value) => onExtraFieldChange("lot_size", value)}
        />
      ) : (
        <StageExtraFieldsSection
          stageId={stageId}
          fields={extraFieldDefs}
          values={extraFields}
          disabled={isSaving}
          onFieldChange={onExtraFieldChange}
        />
      )}

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-small text-subdued">
          <span className="font-semibold text-text">{activeCount}</span> of{" "}
          <span className="font-semibold text-text">{totalCount}</span> parameters active
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSaving}
            className="preview-button-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            className="preview-button-primary"
            onClick={onContinue}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            Save and Add Equipment and Instrument
          </button>
        </div>
      </div>
    </div>
  );
}