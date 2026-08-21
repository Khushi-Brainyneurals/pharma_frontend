// ─── Parameter Types ──────────────────────────────────────────────────────────

/** The two modes a parameter can be in. Maps 1-to-1 with the API field. */
export type ParameterMode = "limit" | "record_only";

/**
 * The acceptance-limit shape:
 *  - range → show min + max
 *  - nmt   → "not more than" — only max is meaningful
 *  - nlt   → "not less than" — only min is meaningful
 * Only relevant when mode === "limit".
 */
export type ParameterKind = "range" | "nmt" | "nlt";

/**
 * Exact shape of a single parameter object as sent to / received from the API.
 * Field names MUST NOT be renamed — they are the backend contract.
 */
export interface StageParameter {
  /** API name: temperature | relative_humidity | differential_pressure | holding_period | yield */
  name: string;
  /** Whether this parameter is active for the stage. Default: true */
  enabled: boolean;
  /** limit | record_only. Default: "record_only" */
  mode: ParameterMode;
  /** range | nmt | nlt | null. Only meaningful when mode === "limit". */
  kind: ParameterKind | null;
  /** Lower bound string (for range / nlt). Default: "" */
  min: string;
  /** Upper bound string (for range / nmt). Default: "" */
  max: string;
  /** Generic value string (currently unused by UI, preserved for API compat). Default: "" */
  value: string;
  /**
   * Per-instance unit string. Common field, DEFAULT free-text UI is not shown
   * (existing 4 parameters' UI is unchanged) — except holding_period, which
   * collects it via a controlled Day/Month select. Default: ""
   */
  unit: string;
}

/**
 * The API shape of one parameter as actually sent/received. Which fields are
 * present depends on the parameter's config and, for Limit mode, its `kind`
 * - see `toApiParameter` in `hooks/useStageState` for the exact rules:
 *  - Not a Limit-capable parameter (`!ParameterConfig.allowsLimit`, e.g.
 *    holding_period): `value` + `unit`, no `mode`/`kind`/`min`/`max`.
 *  - Record-only, or Limit mode with no kind chosen yet: just `mode`.
 *  - Limit mode, kind "range": `mode` + `kind` + `min` + `max`, no `value`.
 *  - Limit mode, kind "nmt"/"nlt": `mode` + `kind` + `value` (the single
 *    bound - internally `max` for nmt, `min` for nlt), no `min`/`max`.
 */
export interface ApiParameterPayload {
  name: string;
  enabled: boolean;
  mode?: ParameterMode;
  kind?: ParameterKind | null;
  min?: string;
  max?: string;
  value?: string;
  unit?: string;
  /**
   * Present (always `""`) only for stages whose payload uses `layer` instead
   * of a processing_step/CPP breakdown - see `stageUsesLayerField` in
   * `config/stageParameters.config`. Absent for every other stage.
   */
  layer?: string;
}

// ─── Equipment / Instrument Types ──────────────────────────────────────────────

/**
 * One equipment record attached to a stage. Field names MUST NOT be renamed —
 * they are the backend contract (`equipment_list[]` inside the stage payload).
 */
export interface EquipmentListItem {
  /** Equipment master's `name_of_machine`. */
  name: string;
  /** Equipment master's `machine_id_no`. */
  id: string;
  /**
   * The processing step selected from the equipment master's `steps[]`.
   * Only present for stages that use the step/CPP breakdown - see
   * `stageEquipmentHasProcessingStep` in `config/stageParameters.config`.
   * Omitted entirely (not sent) for dispensing/inspection stages.
   */
  processing_step?: string;
  /** CPP name -> value. Present/omitted alongside `processing_step`. */
  cpp_values?: Record<string, string>;
  /** Present (always `""`) alongside `processing_step`'s absence - see `stageUsesLayerField`. */
  layer?: string;
}

/**
 * One instrument record attached to a stage (`instrument_list[]` inside the
 * stage payload). Field names MUST NOT be renamed.
 */
export interface InstrumentListItem {
  /** Instrument master's `name_of_instrument`. */
  name: string;
  /** Instrument master's `instrument_id_no`. */
  id: string;
  /** Present (always `""`) only for stages whose payload uses `layer` - see `stageUsesLayerField`. */
  layer?: string;
}

// ─── Stage Types ──────────────────────────────────────────────────────────────

/**
 * The stage catalog itself (`{ key, label }`) is the shared `StageOption` type
 * from `master-data/api/masterData.types` - the same one backing the
 * Equipment/Instrument dropdowns - fetched via `master-data/hooks/useStages`.
 * There is no separate `Stage` type here; reuse that one instead of duplicating it.
 */

/** The set of selected stage keys - `stage.key`, never index or label. */
export type SelectedStageKeys = Set<string>;

/**
 * Definition of one stage-specific extra field — e.g. Lot Size for
 * `dispensing_rm`. Declared per-stage in `config/stageParameters.config`'s
 * `STAGE_EXTRA_FIELDS` map; stages with no entry there have no extra fields.
 * This is the seam for adding more stage-specific fields later (a future
 * stage's `field_a`/`field_b`) without touching state/API plumbing again.
 */
export interface StageExtraFieldDef {
  /** Payload key — sent verbatim at the top level of the stage's POST payload (e.g. "lot_size"). */
  key: string;
  /** Label shown above the input. */
  label: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
}

/** Per-stage frontend state: the editable parameter list plus equipment/instrument selections. */
export interface StageState {
  parameters: StageParameter[];
  equipmentList: EquipmentListItem[];
  instrumentList: InstrumentListItem[];
  /**
   * Stage-specific extra field values, keyed by payload key (e.g.
   * `{ lot_size: "25" }` for `dispensing_rm`). Empty object for stages with
   * no extra fields configured — see `StageExtraFieldDef`.
   */
  extraFields: Record<string, string>;
  /**
   * The Yield Limit value - only meaningful for `batch_yield_reconciliation`
   * (see `isYieldReconciliationStage` in `config/stageParameters.config`).
   * "" for every other stage.
   */
  yieldLimit: string;
}

/**
 * The full state map — one entry per stage ID.
 * Stages not yet opened by the user won't have an entry until loaded.
 */
export type StageStateMap = Record<string, StageState>;

// ─── API Payload Type ─────────────────────────────────────────────────────────

/**
 * The payload sent to POST /api/bmr/documents/{documentId}/stages/{stageKey}/params
 */
export interface StageParamsPayload {
  parameters: ApiParameterPayload[];
  equipment_list: EquipmentListItem[];
  instrument_list: InstrumentListItem[];
  /**
   * Stage-specific extra fields (e.g. `lot_size`), spread in at the top
   * level from `StageState.extraFields`. Absent for stages with no extra
   * fields configured — see `StageExtraFieldDef`.
   */
  [extraFieldKey: string]: ApiParameterPayload[] | EquipmentListItem[] | InstrumentListItem[] | string;
}

/**
 * The payload sent to POST .../stages/batch_yield_reconciliation/params.
 * This stage has no parameters/equipment/instrument breakdown - see
 * `isYieldReconciliationStage` in `config/stageParameters.config`. Deliberately
 * NOT merged into `StageParamsPayload` - the two payload shapes are mutually
 * exclusive per stage.
 */
export interface YieldReconciliationPayload {
  yield_limit: string;
  user: string;
}

// ─── Save-State Helpers ───────────────────────────────────────────────────────

/** Tracks which stages have been successfully saved this session. */
export type SavedStageSet = Set<string>;
