import { Check, Loader2 } from "lucide-react";
import type { ParameterKind, ParameterMode, StageParameter } from "../types/stages.types";
import { ParameterCard } from "./ParameterCard";

interface ParameterPanelProps {
  stageId: string;
  stageName: string;
  parameters: StageParameter[];
  isSaving: boolean;
  onToggleEnabled: (paramIndex: number) => void;
  onModeChange: (paramIndex: number, mode: ParameterMode) => void;
  onKindChange: (paramIndex: number, kind: ParameterKind) => void;
  onMinChange: (paramIndex: number, value: string) => void;
  onMaxChange: (paramIndex: number, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
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
  parameters,
  isSaving,
  onToggleEnabled,
  onModeChange,
  onKindChange,
  onMinChange,
  onMaxChange,
  onCancel,
  onSave,
}: ParameterPanelProps) {
  const activeCount = parameters.filter((p) => p.enabled).length;
  const totalCount = parameters.length;

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
          />
        ))}
      </div>

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
            onClick={onSave}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Save parameters
          </button>
        </div>
      </div>
    </div>
  );
}
