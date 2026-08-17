import { useCallback, useState } from "react";
import type {
  EquipmentListItem,
  InstrumentListItem,
  ParameterMode,
  ParameterKind,
  StageParameter,
  StageState,
  StageStateMap,
} from "../types/stages.types";
import { getStageParameterNames } from "../config/stageParameters.config";

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
  };
}

function makeDefaultStageState(stageId: string): StageState {
  const parameters = getStageParameterNames(stageId).map(makeDefaultParameter);
  return { parameters, equipmentList: [], instrumentList: [] };
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
  return {
    name: asString(item.name) || fallbackName,
    enabled: item.enabled !== false,
    mode: asMode(item.mode),
    kind: asKind(item.kind),
    min: asString(item.min),
    max: asString(item.max),
    value: asString(item.value),
  };
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asCppValues(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(v)) {
    result[key] = typeof value === "string" ? value : String(value ?? "");
  }
  return result;
}

/** Normalizes one raw equipment_list entry from the API; returns null if unusable. */
function normalizeEquipmentItem(raw: unknown): EquipmentListItem | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name);
  const id = asString(raw.id);
  if (!name && !id) return null;
  return {
    name,
    id,
    processing_step: asString(raw.processing_step),
    cpp_values: asCppValues(raw.cpp_values),
    lot: asNumber(raw.lot, 1),
  };
}

/** Normalizes one raw instrument_list entry from the API; returns null if unusable. */
function normalizeInstrumentItem(raw: unknown): InstrumentListItem | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name);
  const id = asString(raw.id);
  if (!name && !id) return null;
  return { name, id, lot: asNumber(raw.lot, 1) };
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

  return { parameters, equipmentList, instrumentList };
}

/** Returns true if any saved data exists in the API response. */
export function hasSavedData(apiData: unknown): boolean {
  if (!isRecord(apiData)) return false;
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
    markSaved,
    markUnsaved,
    getOrCreateStageState,
    resetStageState,
  };
}
