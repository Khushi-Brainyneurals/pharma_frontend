import type { StageExtraFieldDef } from "../types/stages.types";

interface StageExtraFieldsSectionProps {
  stageId: string;
  fields: StageExtraFieldDef[];
  values: Record<string, string>;
  disabled: boolean;
  onFieldChange: (fieldKey: string, value: string) => void;
}

/**
 * Renders whichever extra fields a stage's config declares (see
 * `getStageExtraFields`) - currently just Lot Size for `dispensing_rm`.
 * Renders nothing for stages with no extra fields, so no per-stage
 * conditional is needed at the call site.
 */
export function StageExtraFieldsSection({
  stageId,
  fields,
  values,
  disabled,
  onFieldChange,
}: StageExtraFieldsSectionProps) {
  if (fields.length === 0) return null;

  return (
    <div className="mt-6 mb-4 flex flex-wrap gap-4">
      {fields.map((field) => {
        const inputId = `stage-extra-${stageId}-${field.key}`;
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-small font-semibold text-text">
              {field.label}
            </label>
            <input
              id={inputId}
              type="text"
              inputMode={field.inputMode ?? "text"}
              value={values[field.key] ?? ""}
              disabled={disabled}
              placeholder={field.placeholder}
              className="h-9 w-48 rounded-control border border-border bg-surface px-3 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(e) => onFieldChange(field.key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
