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

/** Per-stage frontend state: the editable parameter list. */
export interface StageState {
  parameters: StageParameter[];
}

/**
 * The full state map — one entry per stage ID.
 * Stages not yet opened by the user won't have an entry until loaded.
 */
export type StageStateMap = Record<string, StageState>;

// ─── API Payload Type ─────────────────────────────────────────────────────────

/**
 * The payload sent to POST /api/bmr/documents/{documentId}/stages/{stageKey}/params
 * Only the `parameters` key is in scope for this release.
 */
export interface StageParamsPayload {
  parameters: StageParameter[];
}

// ─── Save-State Helpers ───────────────────────────────────────────────────────

/** Tracks which stages have been successfully saved this session. */
export type SavedStageSet = Set<string>;
