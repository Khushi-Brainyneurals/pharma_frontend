import type { ParameterKind } from "../types/stages.types";

interface LimitConfigProps {
  kind: ParameterKind | null;
  min: string;
  max: string;
  disabled: boolean;
  parameterLabel: string;
  onKindChange: (kind: ParameterKind) => void;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}

/**
 * Renders the kind selector and value inputs for a parameter in Limit mode.
 *
 * - range → [kind dropdown] [min] — [max]
 * - nmt   → [kind dropdown] [max]   (not more than)
 * - nlt   → [kind dropdown] [min]   (not less than)
 */
export function LimitConfig({
  kind,
  min,
  max,
  disabled,
  parameterLabel,
  onKindChange,
  onMinChange,
  onMaxChange,
}: LimitConfigProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {/* Kind selector */}
        <select
          value={kind ?? ""}
          disabled={disabled}
          aria-label={`${parameterLabel} limit kind`}
          className="h-8 rounded-control border border-border bg-surface px-1.5 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ minWidth: 148 }}
          onChange={(e) => onKindChange(e.target.value as ParameterKind)}
        >
          <option value="" disabled>
            Kind…
          </option>
          <option value="range">Range (min–max)</option>
          <option value="nmt">Not more than</option>
          <option value="nlt">Not less than</option>
        </select>

        {/* Value inputs based on kind */}
        {kind === "range" ? (
          <>
            <input
              type="text"
              inputMode="decimal"
              value={min}
              disabled={disabled}
              aria-label={`${parameterLabel} minimum`}
              placeholder="min"
              className="h-8 w-16 rounded-control border border-border bg-surface px-2.5 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(e) => onMinChange(e.target.value)}
            />
            <span className="text-small text-subdued">–</span>
            <input
              type="text"
              inputMode="decimal"
              value={max}
              disabled={disabled}
              aria-label={`${parameterLabel} maximum`}
              placeholder="max"
              className="h-8 w-16 rounded-control border border-border bg-surface px-2.5 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(e) => onMaxChange(e.target.value)}
            />
          </>
        ) : kind === "nmt" ? (
          <input
            type="text"
            inputMode="decimal"
            value={max}
            disabled={disabled}
            aria-label={`${parameterLabel} maximum (not more than)`}
            placeholder="max"
            className="h-9 w-24 rounded-control border border-border bg-surface px-2.5 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(e) => onMaxChange(e.target.value)}
          />
        ) : kind === "nlt" ? (
          <input
            type="text"
            inputMode="decimal"
            value={min}
            disabled={disabled}
            aria-label={`${parameterLabel} minimum (not less than)`}
            placeholder="min"
            className="h-9 w-24 rounded-control border border-border bg-surface px-2.5 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(e) => onMinChange(e.target.value)}
          />
        ) : null}
      </div>
      {kind ? (
        <p className="pl-0.5 text-micro text-subdued">from MFC</p>
      ) : null}
    </div>
  );
}
