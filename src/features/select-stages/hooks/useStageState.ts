import { useCallback, useState } from "react";
import type {
  ApiParameterPayload,
  EquipmentListItem,
  InstrumentListItem,
  ParameterMode,
  ParameterKind,
  StageParameter,
  StageState,
  StageStateMap,
} from "../types/stages.types";
import { getStageExtraFields, getStageParameterNames } from "../config/stageParameters.config";
import { getParameterConfig } from "../config/parameters.config";

// ─── Default factory ──────────────────────────────────────────────────────────

function makeDefaultParameter(name: string): StageParameter {
  return {
    name,
    enabled: false,
    mode: "record_only",
    kind: null,
    min: "",
    max: "",
    value: "",
    unit: "",
  };
}

/** Default extra-field values for a stage - "" for every field its config declares. */
function makeDefaultExtraFields(stageId: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of getStageExtraFields(stageId)) {
    result[field.key] = "";
  }
  return result;
}

function makeDefaultStageState(stageId: string): StageState {
  const parameters = getStageParameterNames(stageId).map(makeDefaultParameter);
  return {
    parameters,
    equipmentList: [],
    instrumentList: [],
    extraFields: makeDefaultExtraFields(stageId),
    yieldLimit: "",
  };
}

// ─── Normalization from API response ─────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asMode(v: unknown): ParameterMode {
  return v === "limit" ? "limit" : "record_only";
}

function asKind(v: unknown): ParameterKind | null {
  if (v === "range" || v === "nmt" || v === "nlt") return v;
  return null;
}

function normalizeParameter(raw: unknown, fallbackName: string): StageParameter {
  const item = isRecord(raw) ? raw : {};
  const mode = asMode(item.mode);
  const kind = asKind(item.kind);
  const boundValue = asString(item.value);

  // For Limit mode with kind nmt/nlt, the API's single-bound `value` field
  // carries the saved bound (the inverse of `toApiParameter`'s outbound
  // mapping) - restore it into the internal `max` (nmt) / `min` (nlt) field
  // that `LimitConfig` actually reads, instead of the (empty) min/max the
  // API sends alongside it for that shape.
  const min = mode === "limit" && kind === "nlt" ? boundValue : asString(item.min);
  const max = mode === "limit" && kind === "nmt" ? boundValue : asString(item.max);

  return {
    name: asString(item.name) || fallbackName,
    enabled: item.enabled !== false,
    mode,
    kind,
    min,
    max,
    value: boundValue,
    unit: asString(item.unit),
  };
}

function asCppValues(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(v)) {
    result[key] = typeof value === "string" ? value : String(value ?? "");
  }
  return result;
}

/**
 * Normalizes one raw equipment_list entry from the API; returns null if
 * unusable. `processing_step`/`cpp_values` are only carried over when the
 * API actually sent them - stages without the step/CPP breakdown (see
 * `stageEquipmentHasProcessingStep`) omit them entirely, both in and out.
 */
function normalizeEquipmentItem(raw: unknown): EquipmentListItem | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name);
  const id = asString(raw.id);
  if (!name && !id) return null;
  const item: EquipmentListItem = { name, id };
  if ("processing_step" in raw) item.processing_step = asString(raw.processing_step);
  if ("cpp_values" in raw) item.cpp_values = asCppValues(raw.cpp_values);
  if ("layer" in raw) item.layer = asString(raw.layer);
  return item;
}

/** Normalizes one raw instrument_list entry from the API; returns null if unusable. */
function normalizeInstrumentItem(raw: unknown): InstrumentListItem | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name);
  const id = asString(raw.id);
  if (!name && !id) return null;
  const item: InstrumentListItem = { name, id };
  if ("layer" in raw) item.layer = asString(raw.layer);
  return item;
}

/**
 * Pulls this stage's configured extra fields (e.g. `lot_size` for
 * `dispensing_rm`) out of the raw API response. Stages with no extra fields
 * configured get back `{}`, so this never affects other stages.
 */
function extraFieldsFromApi(stageId: string, record: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of getStageExtraFields(stageId)) {
    result[field.key] = asString(record[field.key]);
  }
  return result;
}

/**
 * Merges API-returned parameter data with the stage's config parameter list.
 * Config defines which parameters exist; API data overrides values where available.
 * Equipment/instrument lists come straight from the API - there is no config
 * catalog for them, so anything malformed is simply dropped rather than crashing.
 */
export function buildStageStateFromApi(
  stageId: string,
  apiData: unknown,
): StageState {
  const configParams = getStageParameterNames(stageId);

  const record = isRecord(apiData) ? apiData : {};
  const apiParams = Array.isArray(record.parameters) ? record.parameters : [];

  // Build a name→raw lookup from the API response
  const apiByName = new Map<string, unknown>();
  for (const p of apiParams) {
    if (isRecord(p) && typeof p.name === "string") {
      apiByName.set(p.name, p);
    }
  }

  // Merge: config order, API values where present
  const parameters = configParams.map((name) => {
    const raw = apiByName.get(name);
    return raw
      ? normalizeParameter(raw, name)
      : makeDefaultParameter(name);
  });

  const equipmentList = Array.isArray(record.equipment_list)
    ? record.equipment_list
        .map(normalizeEquipmentItem)
        .filter((item): item is EquipmentListItem => item !== null)
    : [];

  const instrumentList = Array.isArray(record.instrument_list)
    ? record.instrument_list
        .map(normalizeInstrumentItem)
        .filter((item): item is InstrumentListItem => item !== null)
    : [];

  const extraFields = extraFieldsFromApi(stageId, record);
  const yieldLimit = asString(record.yield_limit);

  return { parameters, equipmentList, instrumentList, extraFields, yieldLimit };
}

/**
 * Builds the outgoing API shape for one parameter - only the fields the
 * backend actually expects for its mode/kind, per the confirmed contract:
 *  - Not Limit-capable (`!ParameterConfig.allowsLimit`, e.g. holding_period):
 *    `value` + `unit`, no `mode`/`kind`/`min`/`max`.
 *  - Record-only, or Limit mode with no kind chosen yet: just `mode`.
 *  - Limit mode, kind "range": `mode` + `kind` + `min` + `max` (no `value`).
 *  - Limit mode, kind "nmt"/"nlt": `mode` + `kind` + `value` - the single
 *    bound that matters, taken from `max` (nmt) or `min` (nlt); `min`/`max`
 *    themselves are omitted.
 * `layer` is only appended for stages confirmed to use it - see `stageUsesLayerField`.
 */
function toApiParameter(parameter: StageParameter, includeLayer: boolean): ApiParameterPayload {
  const base: ApiParameterPayload = {
    name: parameter.name,
    enabled: parameter.enabled,
  };

  let shaped: ApiParameterPayload;
  if (!getParameterConfig(parameter.name).allowsLimit) {
    shaped = { ...base, value: parameter.value, unit: parameter.unit };
  } else if (parameter.mode !== "limit" || !parameter.kind) {
    shaped = { ...base, mode: parameter.mode };
  } else if (parameter.kind === "range") {
    shaped = { ...base, mode: parameter.mode, kind: parameter.kind, min: parameter.min, max: parameter.max };
  } else if (parameter.kind === "nmt") {
    shaped = { ...base, mode: parameter.mode, kind: parameter.kind, value: parameter.max };
  } else {
    shaped = { ...base, mode: parameter.mode, kind: parameter.kind, value: parameter.min };
  }

  return includeLayer ? { ...shaped, layer: "" } : shaped;
}

/** Builds the `parameters` array for a stage's POST payload from its frontend state. */
export function toApiParameters(parameters: StageParameter[], includeLayer: boolean): ApiParameterPayload[] {
  return parameters.map((parameter) => toApiParameter(parameter, includeLayer));
}

/** Returns true if any saved data exists in the API response. */
export function hasSavedData(apiData: unknown): boolean {
  if (!isRecord(apiData)) return false;
  if (typeof apiData.yield_limit === "string" && apiData.yield_limit.trim() !== "") return true;
  if (Array.isArray(apiData.parameters) && apiData.parameters.length > 0) return true;
  if (Array.isArray(apiData.equipment_list) && apiData.equipment_list.length > 0) return true;
  if (Array.isArray(apiData.instrument_list) && apiData.instrument_list.length > 0) return true;
  return false;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseStageStateReturn {
  stageStateMap: StageStateMap;
  savedStageIds: Set<string>;
  setStageState: (stageId: string, state: StageState) => void;
  updateParameter: (
    stageId: string,
    paramIndex: number,
    field: keyof StageParameter,
    value: string | boolean | ParameterMode | ParameterKind | null,
  ) => void;
  setEquipmentList: (stageId: string, list: EquipmentListItem[]) => void;
  setInstrumentList: (stageId: string, list: InstrumentListItem[]) => void;
  updateExtraField: (stageId: string, fieldKey: string, value: string) => void;
  updateYieldLimit: (stageId: string, value: string) => void;
  markSaved: (stageId: string) => void;
  markUnsaved: (stageId: string) => void;
  getOrCreateStageState: (stageId: string) => StageState;
  resetStageState: (stageId: string, toState: StageState) => void;
}

/**
 * Central state management hook for stage parameters.
 *
 * - Each stage maintains its own parameter list.
 * - Expanding/collapsing never resets values.
 * - Enabling/disabling a parameter does not reset its other fields.
 * - Mode changes preserve existing values.
 * - All updates are immutable.
 */
export function useStageState(): UseStageStateReturn {
  const [stageStateMap, setStageStateMap] = useState<StageStateMap>({});
  const [savedStageIds, setSavedStageIds] = useState<Set<string>>(new Set());

  const getOrCreateStageState = useCallback(
    (stageId: string): StageState => {
      return stageStateMap[stageId] ?? makeDefaultStageState(stageId);
    },
    [stageStateMap],
  );

  const setStageState = useCallback((stageId: string, state: StageState) => {
    setStageStateMap((prev) => ({ ...prev, [stageId]: state }));
  }, []);

  const resetStageState = useCallback((stageId: string, toState: StageState) => {
    setStageStateMap((prev) => ({ ...prev, [stageId]: toState }));
  }, []);

  const updateParameter = useCallback(
    (
      stageId: string,
      paramIndex: number,
      field: keyof StageParameter,
      value: string | boolean | ParameterMode | ParameterKind | null,
    ) => {
      setStageStateMap((prev) => {
        const current = prev[stageId] ?? makeDefaultStageState(stageId);
        const parameters = current.parameters.map((p, i) =>
          i === paramIndex ? { ...p, [field]: value } : p,
        );
        return { ...prev, [stageId]: { ...current, parameters } };
      });
      // Any edit marks the stage as unsaved
      setSavedStageIds((prev) => {
        const next = new Set(prev);
        next.delete(stageId);
        return next;
      });
    },
    [],
  );

  const setEquipmentList = useCallback((stageId: string, list: EquipmentListItem[]) => {
    setStageStateMap((prev) => {
      const current = prev[stageId] ?? makeDefaultStageState(stageId);
      return { ...prev, [stageId]: { ...current, equipmentList: list } };
    });
    setSavedStageIds((prev) => {
      const next = new Set(prev);
      next.delete(stageId);
      return next;
    });
  }, []);

  const setInstrumentList = useCallback((stageId: string, list: InstrumentListItem[]) => {
    setStageStateMap((prev) => {
      const current = prev[stageId] ?? makeDefaultStageState(stageId);
      return { ...prev, [stageId]: { ...current, instrumentList: list } };
    });
    setSavedStageIds((prev) => {
      const next = new Set(prev);
      next.delete(stageId);
      return next;
    });
  }, []);

  const updateExtraField = useCallback((stageId: string, fieldKey: string, value: string) => {
    setStageStateMap((prev) => {
      const current = prev[stageId] ?? makeDefaultStageState(stageId);
      return {
        ...prev,
        [stageId]: { ...current, extraFields: { ...current.extraFields, [fieldKey]: value } },
      };
    });
    setSavedStageIds((prev) => {
      const next = new Set(prev);
      next.delete(stageId);
      return next;
    });
  }, []);

  const updateYieldLimit = useCallback((stageId: string, value: string) => {
    setStageStateMap((prev) => {
      const current = prev[stageId] ?? makeDefaultStageState(stageId);
      return { ...prev, [stageId]: { ...current, yieldLimit: value } };
    });
    setSavedStageIds((prev) => {
      const next = new Set(prev);
      next.delete(stageId);
      return next;
    });
  }, []);

  const markSaved = useCallback((stageId: string) => {
    setSavedStageIds((prev) => new Set(prev).add(stageId));
  }, []);

  const markUnsaved = useCallback((stageId: string) => {
    setSavedStageIds((prev) => {
      const next = new Set(prev);
      next.delete(stageId);
      return next;
    });
  }, []);

  return {
    stageStateMap,
    savedStageIds,
    setStageState,
    updateParameter,
    setEquipmentList,
    setInstrumentList,
    updateExtraField,
    updateYieldLimit,
    markSaved,
    markUnsaved,
    getOrCreateStageState,
    resetStageState,
  };
}
