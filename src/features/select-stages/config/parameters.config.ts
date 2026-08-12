/**
 * Centralized configuration for all supported in-process parameters.
 * Do NOT duplicate this metadata across components.
 *
 * - `label`       — Human-readable display name
 * - `unit`        — SI/display unit string shown next to the label
 * - `allowsLimit` — Whether the Limit mode (with kind/min/max) applies
 */
export interface ParameterConfig {
  label: string;
  unit: string;
  allowsLimit: boolean;
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
  holding_period: {
    label: "Holding period",
    unit: "hrs",
    allowsLimit: true,
  },
  yield: {
    label: "Yield",
    unit: "%",
    allowsLimit: true,
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
