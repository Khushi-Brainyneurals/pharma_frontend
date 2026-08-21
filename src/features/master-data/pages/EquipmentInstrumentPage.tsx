import { Loader2, Save } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { MASTER_DATA_ROUTES } from "../../../app/routing/routes";
import { useAuthStore } from "../../auth/state/auth.store";
import {
  createApprovalApi,
  deleteEquipment,
  deleteInstrument,
  getEquipments,
  getInstruments,
  saveEquipments,
  saveInstruments,
  updateEquipment,
  updateInstrument,
} from "../api/equipmentInstrument.api";
import type { EquipmentRow, InstrumentRow, MasterDataStep } from "../api/masterData.types";
import { ApprovalPanel } from "../components/ApprovalPanel";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EditableMasterTable, type MasterColumn } from "../components/EditableMasterTable";
import { MasterDataBanner } from "../components/MasterDataBanner";
import { MasterDataShell } from "../components/MasterDataShell";
import { StepsEditorDialog } from "../components/StepsEditorDialog";
import { useApproval } from "../hooks/useApproval";
import { useMasterList } from "../hooks/useMasterList";
import { getEditability, getMasterDataPermissions } from "../model/masterData.permissions";

type TabId = "equipment" | "instrument";

const STEPS_COLUMN_KEY = "steps";

const EQUIPMENT_COLUMN_KEYS = [
  "name_of_machine",
  "capacity",
  "working_capacity",
  "machine_id_no",
  "stage",
  "processing_stage",
  STEPS_COLUMN_KEY,
];

const INSTRUMENT_COLUMN_KEYS = ["name_of_instrument", "instrument_id_no", "location", "stage"];

function parseSteps(raw: string): MasterDataStep[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is { step?: unknown; cpp?: unknown } => Boolean(item) && typeof item === "object")
      .map((item) => ({
        step: typeof item.step === "string" ? item.step : "",
        cpp: Array.isArray(item.cpp) ? item.cpp.filter((value): value is string => typeof value === "string") : [],
      }));
  } catch {
    return [];
  }
}

function summarizeSteps(raw: string): string {
  const steps = parseSteps(raw);

  if (steps.length === 0) {
    return "Manage steps";
  }

  const cppCount = steps.reduce((sum, item) => sum + item.cpp.length, 0);
  return `${steps.length} step${steps.length === 1 ? "" : "s"} · ${cppCount} CPP${cppCount === 1 ? "" : "s"}`;
}

/**
 * Step names are never typed - they are the comma-separated entries of
 * Processing stage. Re-deriving on every read keeps the two fields in sync:
 * a step kept from `existingSteps` carries its CPPs forward by exact name
 * match, a renamed/removed stage drops its CPPs, and a new stage name starts
 * with an empty CPP list.
 */
function deriveStepsFromProcessingStage(
  processingStage: string,
  existingSteps: MasterDataStep[],
): MasterDataStep[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const part of processingStage.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    names.push(trimmed);
  }

  return names.map((name) => ({
    step: name,
    cpp: existingSteps.find((item) => item.step === name)?.cpp ?? [],
  }));
}

export function EquipmentInstrumentPage() {
  const user = useAuthStore((state) => state.user);
  const permissions = useMemo(() => getMasterDataPermissions(user?.role), [user?.role]);
  const [tab, setTab] = useState<TabId>("equipment");

  const equipmentColumns = useMemo<MasterColumn[]>(
    () => [
      { key: "name_of_machine", label: "Name of machine", required: true, placeholder: "Machine name", minWidth: "min-w-52" },
      { key: "capacity", label: "Capacity", placeholder: "e.g. 100 kg" },
      { key: "working_capacity", label: "Working capacity", placeholder: "e.g. 80 kg" },
      { key: "machine_id_no", label: "M/C ID No.", placeholder: "Unique ID" },
      { key: "stage", label: "Stage", placeholder: "e.g. Granulation" },
      { key: "processing_stage", label: "Processing stage", placeholder: "e.g. Compression", minWidth: "min-w-44" },
      {
        key: STEPS_COLUMN_KEY,
        label: "Process steps & CPPs",
        minWidth: "min-w-40",
        kind: "structured",
        summarize: summarizeSteps,
      },
    ],
    [],
  );

  const instrumentColumns = useMemo<MasterColumn[]>(
    () => [
      { key: "name_of_instrument", label: "Name of instrument", required: true, placeholder: "Instrument name", minWidth: "min-w-52" },
      { key: "instrument_id_no", label: "Instrument ID No.", placeholder: "Unique ID" },
      { key: "location", label: "Location", minWidth: "min-w-44", placeholder: "e.g. Granulation" },
      { key: "stage", label: "Stage", placeholder: "Area / room" },
    ],
    [],
  );

  const equipment = useMasterList<EquipmentRow>({
    load: getEquipments,
    save: saveEquipments,
    updateRow: updateEquipment,
    deleteRow: deleteEquipment,
    getRowId: (row) => row._row_id,
    entityName: "equipment",
    columnKeys: EQUIPMENT_COLUMN_KEYS,
    requiredColumn: { key: "name_of_machine", message: "Name of machine is required." },
    uniqueColumn: { key: "machine_id_no", message: "Duplicate ID - already assigned" },
    toValues: (row) => ({
      name_of_machine: row.name_of_machine ?? "",
      capacity: row.capacity ?? "",
      working_capacity: row.working_capacity ?? "",
      machine_id_no: row.machine_id_no ?? "",
      stage: row.stage ?? "",
      processing_stage: row.processing_stage ?? "",
      steps: JSON.stringify(deriveStepsFromProcessingStage(row.processing_stage ?? "", row.steps ?? [])),
    }),
    fromValues: (values, index, rowId) => ({
      _row_id: rowId,
      sr_no: index + 1,
      name_of_machine: values.name_of_machine ?? "",
      capacity: values.capacity ?? "",
      working_capacity: values.working_capacity ?? "",
      machine_id_no: values.machine_id_no ?? "",
      stage: values.stage ?? "",
      processing_stage: values.processing_stage ?? "",
      steps: parseSteps(values.steps ?? ""),
    }),
  });

  const instrument = useMasterList<InstrumentRow>({
    load: getInstruments,
    save: saveInstruments,
    updateRow: updateInstrument,
    deleteRow: deleteInstrument,
    getRowId: (row) => row._row_id,
    entityName: "instrument",
    columnKeys: INSTRUMENT_COLUMN_KEYS,
    requiredColumn: { key: "name_of_instrument", message: "Name of instrument is required." },
    uniqueColumn: { key: "instrument_id_no", message: "Duplicate ID - already assigned" },
    toValues: (row) => ({
      name_of_instrument: row.name_of_instrument ?? "",
      instrument_id_no: row.instrument_id_no ?? "",
      location: row.location ?? "",
      stage: row.stage ?? "",
    }),
    fromValues: (values, index, rowId) => ({
      _row_id: rowId,
      sr_no: index + 1,
      name_of_instrument: values.name_of_instrument ?? "",
      instrument_id_no: values.instrument_id_no ?? "",
      location: values.location ?? "",
      stage: values.stage ?? "",
    }),
  });

  // Equipment and Instrument each have their own approval workflow now - two
  // independent controllers, not one shared across both lists.
  const equipmentApprovalApi = useMemo(() => createApprovalApi("equipment"), []);
  const instrumentApprovalApi = useMemo(() => createApprovalApi("instrument"), []);

  const onEquipmentApprovalChanged = useCallback(() => {
    equipment.clearLock();
    void equipment.reload();
  }, [equipment]);

  const onInstrumentApprovalChanged = useCallback(() => {
    instrument.clearLock();
    void instrument.reload();
  }, [instrument]);

  const equipmentApproval = useApproval(equipmentApprovalApi, onEquipmentApprovalChanged);
  const instrumentApproval = useApproval(instrumentApprovalApi, onInstrumentApprovalChanged);

  const active = tab === "equipment" ? equipment : instrument;
  const approval = tab === "equipment" ? equipmentApproval : instrumentApproval;
  const editability = getEditability({
    permissions,
    approval: approval.approval,
    isLockedByServer: active.isLockedByServer,
  });

  const nameColumnKey = tab === "equipment" ? "name_of_machine" : "name_of_instrument";
  const submitBlockedReason = active.isDirty
    ? `Save the ${tab === "equipment" ? "equipment" : "instrument"} list before submitting it for approval.`
    : null;

  const [deleteTarget, setDeleteTarget] = useState<{ tab: TabId; rowKey: string; label: string } | null>(
    null,
  );
  const deleteState =
    deleteTarget && deleteTarget.tab === tab ? active.rowActionState[deleteTarget.rowKey] : undefined;

  const [stepsDialog, setStepsDialog] = useState<
    { rowKey: string; machineName: string; processingStage: string; steps: MasterDataStep[] } | null
  >(null);

  /**
   * Processing stage is the single source of truth for step names, so every
   * edit to it must immediately re-derive the steps list - otherwise a bulk
   * save right after typing a new stage (without ever opening the steps
   * dialog) would still send the stale step set.
   */
  function handleCellChange(rowKey: string, column: string, value: string) {
    active.setCell(rowKey, column, value);

    if (tab !== "equipment" || column !== "processing_stage") {
      return;
    }

    const row = equipment.rows.find((item) => item.key === rowKey);
    const nextSteps = deriveStepsFromProcessingStage(value, parseSteps(row?.values.steps ?? ""));
    equipment.setCell(rowKey, STEPS_COLUMN_KEY, JSON.stringify(nextSteps));
  }

  function openStepsEditor(rowKey: string, columnKey: string) {
    if (columnKey !== STEPS_COLUMN_KEY) {
      return;
    }

    const row = equipment.rows.find((item) => item.key === rowKey);
    if (!row) {
      return;
    }

    setStepsDialog({
      rowKey,
      machineName: row.values.name_of_machine ?? "",
      processingStage: row.values.processing_stage ?? "",
      steps: parseSteps(row.values.steps ?? ""),
    });
  }

  function saveStepsEditor(steps: MasterDataStep[]) {
    if (!stepsDialog) {
      return;
    }

    equipment.setCell(stepsDialog.rowKey, STEPS_COLUMN_KEY, JSON.stringify(steps));
    setStepsDialog(null);
  }

  async function saveActiveList() {
    if (await active.save()) {
      // Editing an approved list restarts its review cycle, so re-read the status.
      void approval.reload();
    }
  }

  async function updateActiveRow(rowKey: string) {
    if (await active.updateRow(rowKey)) {
      // Editing an approved list restarts its review cycle, so re-read the status.
      void approval.reload();
    }
  }

  function requestDeleteRow(rowKey: string) {
    const row = active.rows.find((item) => item.key === rowKey);
    setDeleteTarget({ tab, rowKey, label: row?.values[nameColumnKey] || "this row" });
  }

  async function confirmDeleteRow() {
    if (!deleteTarget) {
      return;
    }

    if (await active.deleteRow(deleteTarget.rowKey)) {
      setDeleteTarget(null);
      void approval.reload();
    }
  }

  return (
    <MasterDataShell
      title="Master data"
      heading="Equipment & instrument master"
      description="The machines and instruments available to every document set."
      crumbs={[
        { label: "Master data", to: MASTER_DATA_ROUTES.hub },
        { label: "Equipment & instrument" },
      ]}
    >
      <div className="space-y-5">
        <div
          className="relative inline-flex rounded-full bg-muted p-1"
          role="tablist"
          aria-label="Master lists"
        >
          {/* Sliding pill */}
          <div
            className={`absolute top-1 bottom-1 rounded-full bg-accent-soft transition-all duration-300 ease-in-out ${
              tab === "equipment"
                ? "left-1 w-[calc(50%-4px)]"
                : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
            }`}
          />

          <div className="relative z-10 flex">
            <TabButton
              id="equipment"
              label="Equipment"
              count={equipment.rowCount}
              isActive={tab === "equipment"}
              isDirty={equipment.isDirty}
              onSelect={setTab}
            />

            <TabButton
              id="instrument"
              label="Instruments"
              count={instrument.rowCount}
              isActive={tab === "instrument"}
              isDirty={instrument.isDirty}
              onSelect={setTab}
            />
          </div>
        </div>

        <section
          className="rounded-panel border border-border bg-surface shadow-sm"
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <div className="mr-auto min-w-0">
              <h2 className="text-h3 font-semibold">
                {tab === "equipment"
                  ? "Equipment - machines & processing stages"
                  : "Instruments - measurement & IPQC"}
              </h2>
              <p className="mt-1 text-small text-subdued">
                {tab === "equipment"
                  ? "Sr. No. is derived from row order. Steps come from Processing stage - manage their CPPs from the Process steps column."
                  : "One instrument can serve several stages - separate them with a comma."}
              </p>
            </div>
            <span className="rounded-pill bg-muted px-3 py-1 font-mono text-mono-sm text-subdued">
              {active.rowCount} {active.rowCount === 1 ? "row" : "rows"}
            </span>
          </div>

          <div className="space-y-4 px-5 pt-4">
            {active.loadError ? (
              <MasterDataBanner
                tone="error"
                message={active.loadError}
                actions={
                  <button
                    type="button"
                    className="preview-button-secondary min-h-8 px-3"
                    onClick={() => void active.reload()}
                  >
                    Retry
                  </button>
                }
              />
            ) : null}
            {active.saveError ? <MasterDataBanner tone="error" message={active.saveError} /> : null}
            {active.notice ? <MasterDataBanner tone="success" message={active.notice} /> : null}
            {editability.reason ? <MasterDataBanner tone="locked" message={editability.reason} /> : null}
          </div>

          <div className="mt-4">
            <EditableMasterTable
              columns={tab === "equipment" ? equipmentColumns : instrumentColumns}
              rows={active.rows}
              rowErrors={active.rowErrors}
              canEdit={editability.canEdit}
              isLoading={active.isLoading}
              addLabel={tab === "equipment" ? "Add equipment row" : "Add instrument row"}
              addHint={
                tab === "equipment"
                  ? "New rows need a machine name; IDs must be unique."
                  : "New rows need an instrument name; IDs must be unique."
              }
              emptyMessage={
                editability.canEdit
                  ? "No rows yet - add the first row to start this list."
                  : "No rows have been added to this list yet."
              }
              onCellChange={handleCellChange}
              onAddRow={active.addRow}
              onRemoveRow={active.removeRow}
              onEditColumn={tab === "equipment" ? openStepsEditor : undefined}
              onUpdateRow={editability.canEdit ? (rowKey) => void updateActiveRow(rowKey) : undefined}
              onDeleteRow={editability.canEdit ? requestDeleteRow : undefined}
              rowActionState={active.rowActionState}
              disableRowActions={active.isSaving}
            />
          </div>

          {editability.canEdit ? (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-4">
              <p className="mr-auto text-small text-subdued">
                {active.isDirty ? "Unsaved changes in this list." : "All changes saved."}
              </p>
              <button
                type="button"
                className="preview-button-primary"
                disabled={active.isSaving || !active.isDirty}
                onClick={() => void saveActiveList()}
              >
                {active.isSaving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                Save {tab === "equipment" ? "equipment" : "instrument"} list
              </button>
            </div>
          ) : null}
        </section>

        <ApprovalPanel
          title={`Approval - ${tab === "equipment" ? "equipment" : "instrument"}`}
          description={
            tab === "equipment"
              ? "The equipment list has its own review cycle, independent of instruments."
              : "The instrument list has its own review cycle, independent of equipment."
          }
          controller={approval}
          editability={editability}
          submitBlockedReason={submitBlockedReason}
        />
      </div>

      {deleteTarget ? (
        <ConfirmDialog
          title={`Delete ${deleteTarget.tab === "equipment" ? "equipment" : "instrument"} row`}
          message={`Delete "${deleteTarget.label}"? This removes it from the list - it can no longer be seen or restored from here.`}
          confirmLabel="Delete row"
          busy={deleteState?.status === "busy"}
          error={deleteState?.status === "error" ? (deleteState.message ?? null) : null}
          onConfirm={() => void confirmDeleteRow()}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {stepsDialog ? (
        <StepsEditorDialog
          machineName={stepsDialog.machineName}
          processingStage={stepsDialog.processingStage}
          steps={stepsDialog.steps}
          canEdit={editability.canEdit}
          onSave={saveStepsEditor}
          onClose={() => setStepsDialog(null)}
        />
      ) : null}
    </MasterDataShell>
  );
}

function TabButton({
  id,
  label,
  count,
  isActive,
  isDirty,
  onSelect,
}: {
  id: TabId;
  label: string;
  count: number;
  isActive: boolean;
  isDirty: boolean;
  onSelect: (id: TabId) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      onClick={() => onSelect(id)}
      className={`relative inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-300 ${
        isActive
          ? "border-primary/25 bg-primary text-white shadow-sm"
          : "text-subdued hover:text-text border-0"
      }`}
    >
      {label}
      {/* <span className="rounded-pill bg-muted px-2 py-0.5 font-mono text-[11px] text-subdued">{count}</span> */}
      {isDirty ? (
        <span className="size-1.5 rounded-full bg-draft-fg" aria-label="Unsaved changes" />
      ) : null}
    </button>
  );
}
