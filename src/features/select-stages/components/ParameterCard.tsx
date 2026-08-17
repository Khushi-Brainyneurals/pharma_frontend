import { ArrowRightLeft, Check, ListCheck, PencilSparkles, RulerDimensionLine } from "lucide-react";
import { getParameterConfig } from "../config/parameters.config";
import type { ParameterKind, ParameterMode, StageParameter } from "../types/stages.types";
import { LimitConfig } from "./LimitConfig";

interface ParameterCardProps {
  parameter: StageParameter;
  paramIndex: number;
  stageId: string;
  isSaving: boolean;
  onToggleEnabled: () => void;
  onModeChange: (mode: ParameterMode) => void;
  onKindChange: (kind: ParameterKind) => void;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}

/**
 * Renders a single in-process parameter row inside an expanded stage panel.
 *
 * Layout (from reference image):
 * [checkbox] [name + unit]   [Limit | Record only toggle]   [limit config or record-only label]
 */
export function ParameterCard({
  parameter,
  isSaving,
  onToggleEnabled,
  onModeChange,
  onKindChange,
  onMinChange,
  onMaxChange,
}: ParameterCardProps) {
  const config = getParameterConfig(parameter.name);
  const isDisabled = !parameter.enabled || isSaving;
  const rowDisabled = isSaving;

  return (
    <div
      className={`flex flex-wrap items-start gap-y-3 rounded-control border px-4 py-3 transition-colors ${
        parameter.enabled
          ? "border-border bg-surface"
          : "border-border bg-muted/40"
      }`}
    >
      {/* ── Checkbox + Name + Unit ── */}
      <div className="flex min-w-[160px] flex-1 items-center gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={parameter.enabled}
          aria-label={`Enable ${config.label}`}
          disabled={rowDisabled}
          className={`inline-flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors disabled:cursor-not-allowed ${
            parameter.enabled
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface"
          }`}
          onClick={onToggleEnabled}
        >
          {parameter.enabled ? (
            <Check className="size-3" strokeWidth="3" />
          ) : null}
        </button>

        <span
          className={`text-small font-semibold ${parameter.enabled ? "text-text" : "text-subdued"}`}
        >
          {config.label}
        </span>
        {config.unit ? (
          <span className="text-micro text-subdued">{config.unit}</span>
        ) : null}
      </div>

      {/* ── Mode Toggle ── */}
      <div className="flex min-w-[160px] items-center flex-1 gap-1">
        <div
          className={`inline-flex items-center rounded-control border border-border text-small font-medium transition-opacity ${
            isDisabled ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <button
            type="button"
            id={`mode-limit-${parameter.name}`}
            disabled={isDisabled}
            aria-pressed={parameter.mode === "limit"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-l-control px-3 transition-colors ${
              parameter.mode === "limit"
                ? "bg-accent-soft text-primary-dark"
                : "bg-surface text-subdued hover:bg-muted"
            }`}
            onClick={() => onModeChange("limit")}
          >
            <RulerDimensionLine className="size-3.5" />
            Limit
          </button>
          <button
            type="button"
            id={`mode-record-${parameter.name}`}
            disabled={isDisabled}
            aria-pressed={parameter.mode === "record_only"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-r-control px-3 transition-colors ${
              parameter.mode === "record_only"
                ? "bg-accent-soft text-primary-dark"
                : "bg-surface text-subdued hover:bg-muted"
            }`}
            onClick={() => onModeChange("record_only")}
          >
            <PencilSparkles className="size-3.5" />
            Record only
          </button>
        </div>
      </div>

      {/* ── Right side: Limit config OR record-only label ── */}
      <div className="flex min-w-[200px] flex-1 items-start">
        {parameter.mode === "limit" && parameter.enabled ? (
          <LimitConfig
            kind={parameter.kind}
            min={parameter.min}
            max={parameter.max}
            disabled={isDisabled}
            parameterLabel={config.label}
            onKindChange={onKindChange}
            onMinChange={onMinChange}
            onMaxChange={onMaxChange}
          />
        ) : parameter.mode === "limit" && !parameter.enabled ? (
          <LimitConfig
            kind={parameter.kind}
            min={parameter.min}
            max={parameter.max}
            disabled={true}
            parameterLabel={config.label}
            onKindChange={onKindChange}
            onMinChange={onMinChange}
            onMaxChange={onMaxChange}
          />
        ) : (
          /* Record only */
          <div className="flex items-center gap-2 pt-2 text-small text-subdued">
            <PencilSparkles className="size-3.5 shrink-0" />
            <span>To be recorded during execution — no acceptance limit</span>
          </div>
        )}
      </div>
    </div>
  );
}
