/**
 * Resolves which in-process parameters apply to a given manufacturing stage.
 *
 * The stage list itself (which stages exist, their keys/labels, their order)
 * now comes entirely from the backend (`GET /api/bmr/stages`) - this file is
 * only the "Stage Configuration" concern: given a stage `key`, what fields
 * does it collect. It is deliberately decoupled from the stage catalog so the
 * backend can add/remove/reorder stages without this file changing.
 *
 * Every stage currently uses the same default parameter set. `STAGE_PARAMETER_OVERRIDES`
 * is the seam for giving individual stages their own field list later -
 * add `{ [stageKey]: [...] }` there without touching Select Stage or its state.
 */

const DEFAULT_STAGE_PARAMETER_NAMES = [
  "temperature",
  "relative_humidity",
  "differential_pressure",
  "holding_period",
  "yield",
];

const STAGE_PARAMETER_OVERRIDES: Record<string, string[]> = {};

/** Looks up the parameter list for a stage by its backend `key`. */
export function getStageParameterNames(stageKey: string): string[] {
  return STAGE_PARAMETER_OVERRIDES[stageKey] ?? DEFAULT_STAGE_PARAMETER_NAMES;
}
