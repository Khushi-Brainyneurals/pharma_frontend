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

import type { StageExtraFieldDef } from "../types/stages.types";

const DEFAULT_STAGE_PARAMETER_NAMES = [
  "temperature",
  "relative_humidity",
  "differential_pressure",
  "yield",
  "holding_period",
];

const STAGE_PARAMETER_OVERRIDES: Record<string, string[]> = {
  // No parameters section for this stage - see `isYieldReconciliationStage`.
  batch_yield_reconciliation: [],
};

/** Looks up the parameter list for a stage by its backend `key`. */
export function getStageParameterNames(stageKey: string): string[] {
  return STAGE_PARAMETER_OVERRIDES[stageKey] ?? DEFAULT_STAGE_PARAMETER_NAMES;
}

/**
 * Stage-specific extra fields, beyond the shared parameter/equipment/
 * instrument set - keyed by stage `key`. Empty/absent entries mean the
 * stage has no extra fields.
 *
 * To add a field to another stage later, add an entry here (and nowhere
 * else) - state hydration, persistence, payload building, and the input UI
 * all read this map generically. See `StageExtraFieldDef` in
 * `types/stages.types` for the field shape.
 */
const LOT_SIZE_FIELD: StageExtraFieldDef = {
  key: "lot_size",
  label: "Lot Size",
  placeholder: "Enter lot size",
  inputMode: "numeric",
};

const STAGE_EXTRA_FIELDS: Record<string, StageExtraFieldDef[]> = {
  dispensing_rm: [LOT_SIZE_FIELD],
  dispensing_coating: [LOT_SIZE_FIELD],
};

/** Looks up the extra-field definitions for a stage by its backend `key`. */
export function getStageExtraFields(stageKey: string): StageExtraFieldDef[] {
  return STAGE_EXTRA_FIELDS[stageKey] ?? [];
}

/**
 * Stages whose equipment entries carry no processing-step / CPP breakdown -
 * dispensing and inspection equipment isn't tied to the granulation/
 * compression/coating step+CPP model, so their `equipment_list` entries are
 * trimmed to `{ name, id }` only. See `EquipmentSelection`.
 */
const EQUIPMENT_STAGES_WITHOUT_PROCESSING_STEP = new Set([
  "dispensing_rm",
  "dispensing_coating",
  "uncoated_inspection",
  "coated_inspection",
]);

/** Whether a stage's equipment entries should include `processing_step` / `cpp_values`. */
export function stageEquipmentHasProcessingStep(stageKey: string): boolean {
  return !EQUIPMENT_STAGES_WITHOUT_PROCESSING_STEP.has(stageKey);
}

/**
 * Whether a stage's `parameters`/`equipment_list`/`instrument_list` entries
 * carry a `layer` field (always `""` - the frontend never lets the user pick
 * it) instead of a processing_step/CPP breakdown. Confirmed by the backend's
 * `Set Dispensing Rm Params` schema; the other three stages sharing
 * `dispensing_rm`'s reduced equipment shape are assumed to share this too.
 */
export function stageUsesLayerField(stageKey: string): boolean {
  return !stageEquipmentHasProcessingStep(stageKey);
}

/**
 * The final stage - has no parameters, equipment, or instrument selection at
 * all. Its only configurable field is Yield Limit, posted as
 * `{ yield_limit, user }` instead of the usual `StageParamsPayload` shape.
 * See `YieldLimitPanel`.
 */
const YIELD_RECONCILIATION_STAGE_KEY = "batch_yield_reconciliation";

/** Whether this stage uses the single Yield Limit field instead of parameters/equipment/instrument. */
export function isYieldReconciliationStage(stageKey: string): boolean {
  return stageKey === YIELD_RECONCILIATION_STAGE_KEY;
}

/**
 * `dispensing_rm` collects Lot Size per Cover BOM layer instead of one
 * free-text `lot_size` field - `dispensing_coating` still uses the plain
 * `LOT_SIZE_FIELD` from `STAGE_EXTRA_FIELDS` above. The stored/submitted
 * value stays the same comma-separated `lot_size` string either way; only
 * how it's collected on screen differs. See `LotSizeByLayerField`.
 */
const LAYER_LOT_SIZE_STAGE_KEY = "dispensing_rm";

/** Whether this stage's `lot_size` is collected as one input per Cover BOM layer. */
export function stageUsesLayerLotSize(stageKey: string): boolean {
  return stageKey === LAYER_LOT_SIZE_STAGE_KEY;
}
