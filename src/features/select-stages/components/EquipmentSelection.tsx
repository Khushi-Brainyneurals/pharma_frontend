import { Plus } from "lucide-react";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import type { EquipmentRow } from "../../master-data/api/masterData.types";
import type { EquipmentListItem } from "../types/stages.types";
import { CppFieldsSection } from "./CppFieldsSection";

interface EquipmentSelectionProps {
  /** Already filtered to the current stage. */
  masters: EquipmentRow[];
  disabled?: boolean;
  /**
   * Whether this stage's equipment entries carry a processing step / CPP
   * breakdown. False for dispensing/inspection stages - see
   * `stageEquipmentHasProcessingStep`. When false, the Processing stage and
   * Critical process parameters cards are hidden and the added item omits
   * `processing_step`/`cpp_values` entirely.
   */
  requiresProcessingStage: boolean;
  onAdd: (item: EquipmentListItem) => void;
}

/**
 * Lets the parent pull whatever is currently filled in on this form - used
 * so "Save and continue" can pick up a valid-but-not-yet-"Add"ed draft
 * instead of silently dropping it.
 */
export interface EquipmentSelectionHandle {
  /** Returns the currently drafted item if it's complete enough to submit, else null. */
  getPendingItem: () => EquipmentListItem | null;
}

/**
 * "Equipment selection" -> "Processing stage" -> "Critical process
 * parameters" cards, matching the PharmaDoc_StageInput reference. Every
 * option comes from the (stage-filtered) equipment master data - nothing
 * here is hardcoded. Adding an entry resets the form so another can follow.
 */
export const EquipmentSelection = forwardRef<EquipmentSelectionHandle, EquipmentSelectionProps>(
  function EquipmentSelection({ masters, disabled = false, requiresProcessingStage, onAdd }, ref) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [step, setStep] = useState("");
  // Keyed by `${equipmentId}|${step}` so entering CPP values for one step/
  // equipment combination never overwrites another's - switching processing
  // steps (or equipment) only changes which key is being displayed, it never
  // clears the map itself.
  const [cppByKey, setCppByKey] = useState<Record<string, Record<string, string>>>({});

  const names = useMemo(() => {
    const seen = new Set<string>();
    for (const row of masters) {
      const value = row.name_of_machine?.trim();
      if (value) seen.add(value);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [masters]);

  const rowsForName = useMemo(
    () => masters.filter((row) => row.name_of_machine === name),
    [masters, name],
  );

  const selectedRow = useMemo(
    () => rowsForName.find((row) => row.machine_id_no === id),
    [rowsForName, id],
  );

  const steps = selectedRow?.steps ?? [];
  const selectedStep = steps.find((s) => s.step === step);
  const cppNames = selectedStep?.cpp ?? [];

  // The equipment ID is the stable identifier - two rows can share a
  // `name_of_machine` but never a `machine_id_no`, so keying on id (not name)
  // keeps CPP values isolated per physical equipment even if names collide.
  const cppKey = id && step ? `${id}|${step}` : null;
  const cppValues = cppKey ? cppByKey[cppKey] ?? {} : {};

  function handleNameChange(value: string) {
    setName(value);
    setId("");
    setStep("");
  }

  function handleIdChange(value: string) {
    setId(value);
    setStep("");
  }

  function handleStepChange(value: string) {
    setStep(value);
  }

  function handleCppChange(cppName: string, value: string) {
    if (!cppKey) return;
    setCppByKey((prev) => ({
      ...prev,
      [cppKey]: { ...(prev[cppKey] ?? {}), [cppName]: value },
    }));
  }

  const canAdd = Boolean(
    name && id && (!requiresProcessingStage || steps.length === 0 || step),
  );

  /** Builds the item from whatever is currently filled in, or null if incomplete. */
  function buildPendingItem(): EquipmentListItem | null {
    if (!canAdd || !selectedRow) return null;

    const base: EquipmentListItem = {
      name: selectedRow.name_of_machine,
      id: selectedRow.machine_id_no ?? "",
    };

    if (!requiresProcessingStage) return { ...base, layer: "" };

    const savedValues = cppKey ? cppByKey[cppKey] ?? {} : {};
    const cpp_values: Record<string, string> = {};
    for (const cppName of cppNames) {
      cpp_values[cppName] = savedValues[cppName] ?? "";
    }

    return { ...base, processing_step: step, cpp_values };
  }

  useImperativeHandle(ref, () => ({ getPendingItem: buildPendingItem }));

  function handleAdd() {
    const item = buildPendingItem();
    if (!item) return;

    onAdd(item);

    setName("");
    setId("");
    setStep("");
  }

  return (
    <div className="space-y-3">
      {masters.length === 0 ? (
        <p className="rounded-control border border-border bg-surface px-4 py-3 text-small italic text-subdued">
          No equipment is configured for this stage in the master data.
        </p>
      ) : (
        <>
          {/* ── Selection card ── */}
          <div className="rounded-control border border-border bg-surface p-4">
            <p className="mb-3 text-micro font-semibold uppercase tracking-overline text-subdued">
              Equipment selection
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-micro font-semibold text-subdued">
                  Equipment name <span className="text-danger">*</span>
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
                  Equipment ID <span className="text-danger">*</span>
                </label>
                <select
                  value={id}
                  disabled={disabled || !name}
                  className="h-9 w-full rounded-control border border-border bg-surface px-2 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) => handleIdChange(e.target.value)}
                >
                  <option value="">Select or type…</option>
                  {rowsForName.map((row) => (
                    <option key={row.machine_id_no ?? row._row_id} value={row.machine_id_no ?? ""}>
                      {row.machine_id_no || "(no ID)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedRow ? (
              <div className="mt-3 flex flex-wrap gap-6 rounded-control bg-muted px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-micro font-semibold uppercase tracking-overline text-subdued">
                    Capacity
                  </span>
                  <span className="font-mono text-small text-text">
                    {selectedRow.capacity?.trim() || "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-micro font-semibold uppercase tracking-overline text-subdued">
                    Working capacity
                  </span>
                  <span className="font-mono text-small text-text">
                    {selectedRow.working_capacity?.trim() || "—"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {requiresProcessingStage ? (
            <>
              {/* ── Processing stage card ── */}
              <div className="rounded-control border border-border bg-surface p-4">
                <div className="mb-3 flex items-baseline gap-3">
                  <p className="text-micro font-semibold uppercase tracking-overline text-subdued">
                    Processing stage
                  </p>
                  {steps.length > 0 ? (
                    <span className="font-mono text-micro text-subdued">
                      {steps.length} step{steps.length > 1 ? "s" : ""} · from equipment master
                    </span>
                  ) : null}
                </div>
                {!selectedRow ? (
                  <p className="text-small italic text-subdued">Select equipment above to load its stages.</p>
                ) : steps.length === 0 ? (
                  <p className="text-small italic text-subdued">
                    No processing steps recorded for this equipment.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {steps.map((s) => (
                      <button
                        key={s.step}
                        type="button"
                        disabled={disabled}
                        aria-pressed={step === s.step}
                        className={`rounded-pill border px-3 py-1.5 text-small font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          step === s.step
                            ? "border-primary bg-accent-soft text-primary-dark"
                            : "border-border bg-surface text-subdued hover:bg-muted"
                        }`}
                        onClick={() => handleStepChange(s.step)}
                      >
                        {s.step}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Critical process parameters card ── */}
              <div className="rounded-control border border-border bg-surface p-4">
                <div className="mb-3 flex items-baseline gap-3">
                  <p className="text-micro font-semibold uppercase tracking-overline text-subdued">
                    Critical process parameters
                  </p>
                  {step ? (
                    <span className="font-mono text-micro text-subdued">
                      {name} · {step}
                    </span>
                  ) : null}
                </div>
                {!selectedRow ? (
                  <p className="text-small italic text-subdued">
                    Select equipment, then a stage, to record CPP values.
                  </p>
                ) : !step ? (
                  <p className="text-small italic text-subdued">Select a stage above to load its parameters.</p>
                ) : cppNames.length === 0 ? (
                  <p className="text-small italic text-subdued">No CPP recorded for this stage.</p>
                ) : (
                  <>
                    <CppFieldsSection
                      cppNames={cppNames}
                      values={cppValues}
                      disabled={disabled}
                      onChange={handleCppChange}
                    />
                    <p className="mt-3 rounded-control border-l-2 border-primary bg-muted px-3 py-2 text-micro leading-5 text-subdued">
                      Enter the value recorded for each critical process parameter during execution.
                    </p>
                  </>
                )}
              </div>
            </>
          ) : null}

          <button
            type="button"
            disabled={disabled || !canAdd}
            className="preview-button-secondary min-h-8 px-3"
            onClick={handleAdd}
          >
            <Plus className="size-4" />
            Add equipment
          </button>
        </>
      )}

    </div>
  );
  },
);
