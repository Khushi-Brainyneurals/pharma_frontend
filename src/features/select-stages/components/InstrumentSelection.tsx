import { Plus } from "lucide-react";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import type { InstrumentRow } from "../../master-data/api/masterData.types";
import type { InstrumentListItem } from "../types/stages.types";

interface InstrumentSelectionProps {
  /** Already filtered to the current stage. */
  masters: InstrumentRow[];
  disabled?: boolean;
  /**
   * Whether this stage's instrument entries carry a `layer` field - true for
   * dispensing/inspection stages, see `stageUsesLayerField`. When true, the
   * added item includes `layer: ""` (never user-selected).
   */
  includeLayer: boolean;
  onAdd: (item: InstrumentListItem) => void;
}

/**
 * Lets the parent pull whatever is currently filled in on this form - used
 * so "Save and continue" can pick up a valid-but-not-yet-"Add"ed draft
 * instead of silently dropping it.
 */
export interface InstrumentSelectionHandle {
  /** Returns the currently drafted item if it's complete enough to submit, else null. */
  getPendingItem: () => InstrumentListItem | null;
}

/**
 * "Instrument selection" card, matching the PharmaDoc_StageInput reference.
 * Instruments carry no processing-stage / CPP breakdown in the master data,
 * so - like the reference - this mode has no stage or CPP cards. Options
 * come straight from the (stage-filtered) instrument master data.
 */
export const InstrumentSelection = forwardRef<InstrumentSelectionHandle, InstrumentSelectionProps>(
  function InstrumentSelection({ masters, disabled = false, includeLayer, onAdd }, ref) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");

  const names = useMemo(() => {
    const seen = new Set<string>();
    for (const row of masters) {
      const value = row.name_of_instrument?.trim();
      if (value) seen.add(value);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [masters]);

  const rowsForName = useMemo(
    () => masters.filter((row) => row.name_of_instrument === name),
    [masters, name],
  );

  const selectedRow = useMemo(
    () => rowsForName.find((row) => row.instrument_id_no === id),
    [rowsForName, id],
  );

  function handleNameChange(value: string) {
    setName(value);
    setId("");
  }

  const canAdd = Boolean(name && id);

  /** Builds the item from whatever is currently filled in, or null if incomplete. */
  function buildPendingItem(): InstrumentListItem | null {
    if (!canAdd || !selectedRow) return null;

    const base: InstrumentListItem = {
      name: selectedRow.name_of_instrument,
      id: selectedRow.instrument_id_no ?? "",
    };

    return includeLayer ? { ...base, layer: "" } : base;
  }

  useImperativeHandle(ref, () => ({ getPendingItem: buildPendingItem }));

  function handleAdd() {
    const item = buildPendingItem();
    if (!item) return;

    onAdd(item);

    setName("");
    setId("");
  }

  return (
    <div className="space-y-3">
      {masters.length === 0 ? (
        <p className="rounded-control border border-border bg-surface px-4 py-3 text-small italic text-subdued">
          No instrument is configured for this stage in the master data.
        </p>
      ) : (
        <div className="rounded-control border border-border bg-surface p-4">
          <p className="mb-3 text-micro font-semibold uppercase tracking-overline text-subdued">
            Instrument selection
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-micro font-semibold text-subdued">
                Instrument name <span className="text-danger">*</span>
              </label>
              <select
                value={name}
                disabled={disabled}
                className="h-9 w-full rounded-control border border-border bg-surface px-2 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(e) => handleNameChange(e.target.value)}
              >
                <option value="">Select or type…</option>
                {names.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-micro font-semibold text-subdued">
                Instrument ID <span className="text-danger">*</span>
              </label>
              <select
                value={id}
                disabled={disabled || !name}
                className="h-9 w-full rounded-control border border-border bg-surface px-2 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(e) => setId(e.target.value)}
              >
                <option value="">Select or type…</option>
                {rowsForName.map((row) => (
                  <option key={row.instrument_id_no ?? row._row_id} value={row.instrument_id_no ?? ""}>
                    {row.instrument_id_no || "(no ID)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedRow ? (
            <div className="mt-3 flex flex-wrap gap-6 rounded-control bg-muted px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-micro font-semibold uppercase tracking-overline text-subdued">
                  Location
                </span>
                <span className="font-mono text-small text-text">
                  {selectedRow.location?.trim() || "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-micro font-semibold uppercase tracking-overline text-subdued">
                  Processing stage
                </span>
                <span className="font-mono text-small text-text">{selectedRow.stage?.trim() || "—"}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <button
          type="button"
          disabled={disabled || !canAdd}
          className="preview-button-secondary min-h-8 px-3"
          onClick={handleAdd}
        >
          <Plus className="size-4" />
          Add instrument
        </button>
    </div>
  );
  },
);
