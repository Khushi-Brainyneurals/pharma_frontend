import { httpClient } from "../../../shared/api/httpClient";
import type { ApprovalApi } from "../hooks/useApproval";
import { normalizeMasterDataError } from "./masterData.errors";
import type {
  ApprovalState,
  EquipmentRow,
  InstrumentRow,
  MasterDataStep,
  MasterRowsResponse,
  UpdateEquipmentPayload,
  UpdateInstrumentPayload,
  UpsertRowsResponse,
} from "./masterData.types";

const BASE = "/api/master-data";

export async function getEquipments(signal?: AbortSignal) {
  try {
    const response = await httpClient.get<MasterRowsResponse<EquipmentRow>>(
      `${BASE}/equipments`,
      { signal },
    );
    return response.data.rows ?? [];
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load the equipment list.");
  }
}

export async function getInstruments(signal?: AbortSignal) {
  try {
    const response = await httpClient.get<MasterRowsResponse<InstrumentRow>>(
      `${BASE}/instruments`,
      { signal },
    );
    return response.data.rows ?? [];
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load the instrument list.");
  }
}

/**
 * Bulk create + update in one call: rows carrying an existing `_row_id` are
 * updated in place, rows without one are inserted as new. `_row_id` is the
 * only thing the backend uses to identify an existing row - never
 * `machine_id_no` or the name - so it must round-trip untouched.
 */
export async function saveEquipments(rows: EquipmentRow[], signal?: AbortSignal) {
  try {
    const response = await httpClient.post<UpsertRowsResponse>(
      `${BASE}/equipments`,
      { rows: rows.map(toEquipmentPayload) },
      { signal, timeout: 60_000 },
    );
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to save the equipment list.");
  }
}

export async function saveInstruments(rows: InstrumentRow[], signal?: AbortSignal) {
  try {
    const response = await httpClient.post<UpsertRowsResponse>(
      `${BASE}/instruments`,
      { rows: rows.map(toInstrumentPayload) },
      { signal, timeout: 60_000 },
    );
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to save the instrument list.");
  }
}

/** Edits one row in place - unlike `saveEquipments`, this does not touch the rest of the list. */
export async function updateEquipment(rowId: number, row: EquipmentRow, signal?: AbortSignal) {
  try {
    const response = await httpClient.put<EquipmentRow>(
      `${BASE}/equipments/${rowId}`,
      toEquipmentUpdatePayload(row),
      { signal },
    );
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to update this equipment row.");
  }
}

/** Soft-delete - the row drops out of GET and its ID code frees up for reuse. */
export async function deleteEquipment(rowId: number, signal?: AbortSignal) {
  try {
    await httpClient.delete(`${BASE}/equipments/${rowId}`, { signal });
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to delete this equipment row.");
  }
}

export async function updateInstrument(rowId: number, row: InstrumentRow, signal?: AbortSignal) {
  try {
    const response = await httpClient.put<InstrumentRow>(
      `${BASE}/instruments/${rowId}`,
      toInstrumentUpdatePayload(row),
      { signal },
    );
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to update this instrument row.");
  }
}

export async function deleteInstrument(rowId: number, signal?: AbortSignal) {
  try {
    await httpClient.delete(`${BASE}/instruments/${rowId}`, { signal });
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to delete this instrument row.");
  }
}

/**
 * Equipment and Instrument each have their own, independent approval workflow
 * on the backend (`/equipment/approval*` vs `/instrument/approval*` - no more
 * shared `/equipment-instrument/approval`). The state machine, loading/busy
 * flags and success/error handling all live once in `useApproval`; this
 * factory only selects which module's endpoints back it.
 */
export function createApprovalApi(entity: "equipment" | "instrument"): ApprovalApi {
  const base = `${BASE}/${entity}/approval`;
  const label = entity === "equipment" ? "equipment" : "instrument";

  return {
    load: async (signal) => {
      try {
        const response = await httpClient.get<ApprovalState>(base, { signal });
        return response.data;
      } catch (error) {
        throw await normalizeMasterDataError(error, `Unable to load the ${label} approval status.`);
      }
    },
    submit: async () => {
      try {
        const response = await httpClient.post<ApprovalState>(`${base}/submit`, undefined);
        return response.data;
      } catch (error) {
        throw await normalizeMasterDataError(error, `Unable to submit the ${label} list for approval.`);
      }
    },
    decide: async (decision, reason) => {
      try {
        const response = await httpClient.post<ApprovalState>(
          `${base}/decide`,
          { reason: reason ?? "" },
          { params: { decision } },
        );
        return response.data;
      } catch (error) {
        throw await normalizeMasterDataError(error, `Unable to record the ${label} approval decision.`);
      }
    },
  };
}

/**
 * `_row_id` is left `undefined` for new rows so it is dropped by JSON
 * serialization entirely - the backend inserts whenever `_row_id` is absent
 * and updates in place whenever it is present, so this one field is what
 * lets a single bulk save mix creates and updates.
 */
function toEquipmentPayload(row: EquipmentRow, index: number) {
  return {
    _row_id: row._row_id,
    sr_no: row.sr_no ?? index + 1,
    name_of_machine: text(row.name_of_machine),
    capacity: text(row.capacity),
    working_capacity: text(row.working_capacity),
    machine_id_no: text(row.machine_id_no),
    stage: text(row.stage),
    processing_stage: text(row.processing_stage),
    steps: sanitizeSteps(row.steps),
  };
}

function toInstrumentPayload(row: InstrumentRow, index: number) {
  return {
    _row_id: row._row_id,
    sr_no: row.sr_no ?? index + 1,
    name_of_instrument: text(row.name_of_instrument),
    instrument_id_no: text(row.instrument_id_no),
    location: text(row.location),
    stage: text(row.stage),
  };
}

function toEquipmentUpdatePayload(row: EquipmentRow): UpdateEquipmentPayload {
  return {
    sr_no: row.sr_no ?? undefined,
    name_of_machine: text(row.name_of_machine),
    capacity: text(row.capacity),
    working_capacity: text(row.working_capacity),
    machine_id_no: text(row.machine_id_no),
    stage: text(row.stage),
    processing_stage: text(row.processing_stage),
    steps: sanitizeSteps(row.steps),
  };
}

function toInstrumentUpdatePayload(row: InstrumentRow): UpdateInstrumentPayload {
  return {
    sr_no: row.sr_no ?? undefined,
    name_of_instrument: text(row.name_of_instrument),
    instrument_id_no: text(row.instrument_id_no),
    location: text(row.location),
    stage: text(row.stage),
  };
}

/** Drops blank steps and blank/duplicate-whitespace CPP entries before sending. */
function sanitizeSteps(steps: MasterDataStep[] | undefined) {
  return (steps ?? [])
    .map((item) => ({
      step: item.step?.trim() ?? "",
      cpp: (item.cpp ?? []).map((value) => value.trim()).filter(Boolean),
    }))
    .filter((item) => item.step || item.cpp.length > 0);
}

function text(value: string | undefined) {
  return value?.trim() ?? "";
}
