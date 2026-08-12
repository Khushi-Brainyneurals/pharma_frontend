import { useCallback, useState } from "react";
import type {
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
  return { parameters };
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

/**
 * Merges API-returned parameter data with the stage's config parameter list.
 * Config defines which parameters exist; API data overrides values where available.
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

  return { parameters };
}

/** Returns true if any saved data exists in the API response. */
export function hasSavedData(apiData: unknown): boolean {
  if (!isRecord(apiData)) return false;
  if (Array.isArray(apiData.parameters) && apiData.parameters.length > 0) return true;
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
    markSaved,
    markUnsaved,
    getOrCreateStageState,
    resetStageState,
  };
}
