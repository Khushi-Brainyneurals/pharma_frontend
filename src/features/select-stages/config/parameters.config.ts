/** One option in a parameter's controlled unit-select (e.g. Day/Month for holding_period). */
export interface ParameterUnitOption {
  /** Sent as the parameter's `unit` payload value. */
  value: string;
  label: string;
}

/**
 * Centralized configuration for all supported in-process parameters.
 * Do NOT duplicate this metadata across components.
 *
 * - `label`           — Human-readable display name
 * - `unit`            — Static SI/display unit string shown next to the label
 *                        (e.g. "°C"). Unrelated to the per-instance, editable
 *                        `StageParameter.unit` payload field.
 * - `allowsLimit`     — Whether Limit/Record-only mode (with kind/min/max)
 *                        applies. When false, that UI - and those fields in
 *                        the outgoing payload - are skipped entirely (see
 *                        `toApiParameter` in `hooks/useStageState`).
 * - `unitOptions`      — If set, this parameter collects its per-instance
 *                        `unit` value via a controlled select with these
 *                        options instead of free text (only holding_period
 *                        today). Absent for every other parameter.
 * - `unitSelectLabel`  — Label shown above the unit select, when present.
 */
export interface ParameterConfig {
  label: string;
  unit: string;
  allowsLimit: boolean;
  unitOptions?: ParameterUnitOption[];
  unitSelectLabel?: string;
}

export const PARAMETER_CONFIGS: Record<string, ParameterConfig> = {
  temperature: {
    label: "Temperature",
    unit: "°C",
    allowsLimit: true,
  },
  relative_humidity: {
    label: "Relative humidity",
    unit: "%RH",
    allowsLimit: true,
  },
  differential_pressure: {
    label: "Differential pressure",
    unit: "Pa",
    allowsLimit: true,
  },
    yield: {
    label: "Yield",
    unit: "%",
    allowsLimit: true,
  },
  holding_period: {
    label: "Holding period",
    // No fixed display unit anymore - the unit is user-selected (Day/Month) below.
    unit: "",
    allowsLimit: false,
    unitOptions: [
      { value: "hour", label: "Hour" },
      { value: "day", label: "Day" },
    ],
    unitSelectLabel: "Holding Period Unit",
  },
};

/** Returns the config for a parameter name, or a safe fallback. */
export function getParameterConfig(name: string): ParameterConfig {
  return (
    PARAMETER_CONFIGS[name] ?? {
      label: name.replace(/_/g, " "),
      unit: "",
      allowsLimit: true,
    }
  );
}
