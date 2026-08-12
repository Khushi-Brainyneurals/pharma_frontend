import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { DraftRow, RowActionState } from "../components/EditableMasterTable";

export interface MasterListConfig<TRow> {
  load: (signal?: AbortSignal) => Promise<TRow[]>;
  save: (rows: TRow[]) => Promise<unknown>;
  /** Persists one existing row via the row-level Update API. */
  updateRow: (rowId: number, row: TRow, signal?: AbortSignal) => Promise<unknown>;
  /** Removes one existing row via the row-level Delete API. */
  deleteRow: (rowId: number, signal?: AbortSignal) => Promise<unknown>;
  /** Extracts the server row id a loaded row carries, if any. */
  getRowId: (row: TRow) => number | undefined;
  toValues: (row: TRow) => Record<string, string>;
  /** `rowId` is undefined for rows never saved to the server; forward it so payload builders can tell create from update. */
  fromValues: (values: Record<string, string>, index: number, rowId?: number) => TRow;
  /** Column that must be filled on every row. */
  requiredColumn: { key: string; message: string };
  /** Column whose non-empty values must be unique across rows. */
  uniqueColumn?: { key: string; message: string };
  columnKeys: string[];
  entityName: string;
}

export interface MasterListController {
  rows: DraftRow[];
  rowErrors: Record<string, Record<string, string>>;
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  saveError: string | null;
  notice: string | null;
  isDirty: boolean;
  isLockedByServer: boolean;
  rowCount: number;
  /** Busy/error state for in-flight row-level Update/Delete calls, keyed by row key. */
  rowActionState: Record<string, RowActionState>;
  setCell: (rowKey: string, column: string, value: string) => void;
  addRow: () => void;
  removeRow: (rowKey: string) => void;
  save: () => Promise<boolean>;
  /** Persists one existing row in place; leaves the rest of the list untouched. */
  updateRow: (rowKey: string) => Promise<boolean>;
  /** Deletes one existing row on the server, then reloads the list. */
  deleteRow: (rowKey: string) => Promise<boolean>;
  reload: () => Promise<void>;
  clearLock: () => void;
}

let rowSequence = 0;

function nextKey() {
  rowSequence += 1;
  return `row-${rowSequence}`;
}

/** Load → edit → validate → save for a list master table. */
export function useMasterList<TRow>(config: MasterListConfig<TRow>): MasterListController {
  const configRef = useRef(config);
  configRef.current = config;

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [baseline, setBaseline] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLockedByServer, setIsLockedByServer] = useState(false);
  const [rowActionState, setRowActionStateMap] = useState<Record<string, RowActionState>>({});
  const saveInFlight = useRef(false);
  const rowActionInFlight = useRef<Set<string>>(new Set());

  const setRowActionState = useCallback((rowKey: string, state: RowActionState) => {
    setRowActionStateMap((current) => ({ ...current, [rowKey]: state }));
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const loaded = await configRef.current.load(signal);

      if (signal?.aborted) {
        return;
      }

      const drafts = loaded.map<DraftRow>((row) => ({
        key: nextKey(),
        isNew: false,
        rowId: configRef.current.getRowId(row),
        values: configRef.current.toValues(row),
      }));

      setRows(drafts);
      setBaseline(serialize(drafts));
      setRowErrors({});
      setRowActionStateMap({});
      setLoadError(null);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      const normalized = await normalizeMasterDataError(
        error,
        `Unable to load the ${configRef.current.entityName} list.`,
      );
      setLoadError(normalized.message);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const setCell = useCallback((rowKey: string, column: string, value: string) => {
    setNotice(null);
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey ? { ...row, values: { ...row.values, [column]: value } } : row,
      ),
    );
    setRowErrors((current) => {
      if (!current[rowKey]?.[column]) {
        return current;
      }
      const { [column]: _removed, ...rest } = current[rowKey];
      return { ...current, [rowKey]: rest };
    });
  }, []);

  const addRow = useCallback(() => {
    setNotice(null);
    setRows((current) => [
      ...current,
      {
        key: nextKey(),
        isNew: true,
        values: Object.fromEntries(configRef.current.columnKeys.map((key) => [key, ""])),
      },
    ]);
  }, []);

  const removeRow = useCallback((rowKey: string) => {
    setNotice(null);
    setRows((current) => current.filter((row) => row.key !== rowKey));
    setRowErrors((current) => {
      const { [rowKey]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  const save = useCallback(async () => {
    if (saveInFlight.current) {
      return false;
    }

    const { requiredColumn, uniqueColumn, fromValues, entityName } = configRef.current;
    const errors = validate(rows, requiredColumn, uniqueColumn);
    setRowErrors(errors);

    if (Object.keys(errors).length) {
      setSaveError("Fix the highlighted cells before saving.");
      return false;
    }

    saveInFlight.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      await configRef.current.save(rows.map((row, index) => fromValues(row.values, index, row.rowId)));
      const committed = rows.map((row) => ({ ...row, isNew: false }));
      setRows(committed);
      setBaseline(serialize(committed));
      setNotice(`${capitalize(entityName)} list saved.`);
      setIsLockedByServer(false);
      return true;
    } catch (error) {
      const normalized = await normalizeMasterDataError(error, `Unable to save the ${entityName} list.`);
      setSaveError(normalized.message);
      if (normalized.kind === "locked") {
        setIsLockedByServer(true);
      }
      return false;
    } finally {
      saveInFlight.current = false;
      setIsSaving(false);
    }
  }, [rows]);

  const updateRow = useCallback(
    async (rowKey: string) => {
      const { requiredColumn, uniqueColumn, fromValues, entityName, updateRow: updateApi } =
        configRef.current;

      if (rowActionInFlight.current.has(rowKey)) {
        return false;
      }

      const rowIndex = rows.findIndex((item) => item.key === rowKey);
      const row = rows[rowIndex];

      if (!row || row.rowId === undefined) {
        return false;
      }

      const errors = validate(rows, requiredColumn, uniqueColumn);
      setRowErrors(errors);

      if (errors[rowKey]) {
        setRowActionState(rowKey, { status: "error", message: "Fix the highlighted cells before saving." });
        return false;
      }

      rowActionInFlight.current.add(rowKey);
      setRowActionState(rowKey, { status: "busy" });

      try {
        await updateApi(row.rowId, fromValues(row.values, rowIndex, row.rowId));
        setRowActionState(rowKey, { status: "idle" });
        setNotice(`${capitalize(entityName)} row updated.`);
        await load();
        return true;
      } catch (error) {
        const normalized = await normalizeMasterDataError(error, `Unable to update this ${entityName} row.`);
        setRowActionState(rowKey, { status: "error", message: normalized.message });
        if (normalized.kind === "locked") {
          setIsLockedByServer(true);
        }
        if (normalized.kind === "not-found") {
          void load();
        }
        return false;
      } finally {
        rowActionInFlight.current.delete(rowKey);
      }
    },
    [rows, load, setRowActionState],
  );

  const deleteRow = useCallback(
    async (rowKey: string) => {
      const { entityName, deleteRow: deleteApi } = configRef.current;

      if (rowActionInFlight.current.has(rowKey)) {
        return false;
      }

      const row = rows.find((item) => item.key === rowKey);

      if (!row || row.rowId === undefined) {
        return false;
      }

      rowActionInFlight.current.add(rowKey);
      setRowActionState(rowKey, { status: "busy" });

      try {
        await deleteApi(row.rowId);
        setNotice(`${capitalize(entityName)} row removed.`);
        await load();
        return true;
      } catch (error) {
        const normalized = await normalizeMasterDataError(error, `Unable to delete this ${entityName} row.`);
        setRowActionState(rowKey, { status: "error", message: normalized.message });
        if (normalized.kind === "locked") {
          setIsLockedByServer(true);
        }
        if (normalized.kind === "not-found") {
          void load();
        }
        return false;
      } finally {
        rowActionInFlight.current.delete(rowKey);
      }
    },
    [rows, load, setRowActionState],
  );

  return {
    rows,
    rowErrors,
    isLoading,
    isSaving,
    loadError,
    saveError,
    notice,
    isDirty: useMemo(() => serialize(rows) !== baseline, [baseline, rows]),
    isLockedByServer,
    rowCount: rows.length,
    rowActionState,
    setCell,
    addRow,
    removeRow,
    save,
    updateRow,
    deleteRow,
    reload: useCallback(() => load(), [load]),
    clearLock: useCallback(() => setIsLockedByServer(false), []),
  };
}

function validate(
  rows: DraftRow[],
  requiredColumn: { key: string; message: string },
  uniqueColumn?: { key: string; message: string },
) {
  const errors: Record<string, Record<string, string>> = {};

  function add(rowKey: string, column: string, message: string) {
    errors[rowKey] = { ...errors[rowKey], [column]: message };
  }

  for (const row of rows) {
    if (!row.values[requiredColumn.key]?.trim()) {
      add(row.key, requiredColumn.key, requiredColumn.message);
    }
  }

  if (uniqueColumn) {
    const seen = new Map<string, number>();

    rows.forEach((row, index) => {
      const value = row.values[uniqueColumn.key]?.trim().toLowerCase();

      if (!value) {
        return;
      }

      const firstIndex = seen.get(value);

      if (firstIndex === undefined) {
        seen.set(value, index);
        return;
      }

      add(row.key, uniqueColumn.key, `${uniqueColumn.message} (row ${firstIndex + 1}).`);
    });
  }

  return errors;
}

function serialize(rows: DraftRow[]) {
  return JSON.stringify(rows.map((row) => row.values));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
