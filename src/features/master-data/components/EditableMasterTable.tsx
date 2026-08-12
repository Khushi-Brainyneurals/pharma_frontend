import { Check, Loader2, Plus, Trash2 } from "lucide-react";

export interface MasterColumnOption {
  value: string;
  label: string;
}

export interface MasterColumn {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** Tailwind min-width class so wide free-text columns stay readable. */
  minWidth?: string;
  /** "structured" renders a summary + edit button (via `onEditColumn`); "select" renders a dropdown. */
  kind?: "text" | "structured" | "select";
  /** For kind "structured": turns the raw stored value into the button's label. */
  summarize?: (raw: string) => string;
  /** For kind "select": the selectable {value, label} options. */
  options?: MasterColumnOption[];
  /** For kind "select": true while options are still being fetched. */
  optionsLoading?: boolean;
}

export interface DraftRow {
  key: string;
  isNew: boolean;
  /** The server row id - undefined until this row has been saved at least once. */
  rowId?: number;
  values: Record<string, string>;
}

export interface RowActionState {
  status: "idle" | "busy" | "error";
  message?: string;
}

interface EditableMasterTableProps {
  columns: MasterColumn[];
  rows: DraftRow[];
  rowErrors: Record<string, Record<string, string>>;
  canEdit: boolean;
  isLoading: boolean;
  addLabel: string;
  addHint: string;
  emptyMessage: string;
  onCellChange: (rowKey: string, column: string, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (rowKey: string) => void;
  /** Opens the structured editor for a "structured" column. */
  onEditColumn?: (rowKey: string, column: string) => void;
  /** Persists one existing row via the row-level Update API. */
  onUpdateRow?: (rowKey: string) => void;
  /** Asks for confirmation, then removes one existing row via the row-level Delete API. */
  onDeleteRow?: (rowKey: string) => void;
  rowActionState?: Record<string, RowActionState>;
  /** Disables row-level Update/Delete while an unrelated bulk save is in flight. */
  disableRowActions?: boolean;
}

/**
 * The shared grid behind both list masters - Sr. No. is derived, every other
 * column is free text, and rows added in this session are flagged NEW.
 */
export function EditableMasterTable({
  columns,
  rows,
  rowErrors,
  canEdit,
  isLoading,
  addLabel,
  addHint,
  emptyMessage,
  onCellChange,
  onAddRow,
  onRemoveRow,
  onEditColumn,
  onUpdateRow,
  onDeleteRow,
  rowActionState = {},
  disableRowActions = false,
}: EditableMasterTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-3 p-6 text-small text-subdued">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
        Loading rows…
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-small">
          <thead className="border-b border-border bg-muted text-micro uppercase tracking-overline text-subdued">
            <tr>
              <th scope="col" className="w-16 px-3 py-3 font-semibold">
                Sr. No.
              </th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-3 py-3 font-semibold">
                  {column.label}
                  {column.required ? <span className="ml-1 text-danger">*</span> : null}
                </th>
              ))}
              {canEdit ? (
                <th scope="col" className="w-16 px-3 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (canEdit ? 2 : 1)}
                  className="px-4 py-10 text-center text-small text-subdued"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.key} className="align-top">
                  <td className="bg-muted/60 px-3 py-2 font-mono text-mono-sm text-subdued">
                    <span className="inline-flex items-center gap-1.5">
                      {index + 1}
                      {row.isNew ? (
                        <span className="rounded-pill bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-dark">
                          New
                        </span>
                      ) : null}
                    </span>
                  </td>

                  {columns.map((column) => {
                    const error = rowErrors[row.key]?.[column.key];
                    const raw = row.values[column.key] ?? "";

                    return (
                      <td key={column.key} className={`px-3 py-2 ${column.minWidth ?? ""}`}>
                        {column.kind === "structured" ? (
                          <button
                            type="button"
                            aria-label={`${column.label}, row ${index + 1}`}
                            className="min-h-9 w-full rounded-control border border-border bg-surface px-2 py-1.5 text-left text-sm text-text transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            onClick={() => onEditColumn?.(row.key, column.key)}
                          >
                            {column.summarize ? column.summarize(raw) : "Edit"}
                          </button>
                        ) : column.kind === "select" ? (
                          <SelectCell
                            column={column}
                            raw={raw}
                            canEdit={canEdit}
                            index={index}
                            hasError={Boolean(error)}
                            onChange={(value) => onCellChange(row.key, column.key, value)}
                          />
                        ) : (
                          <input
                            value={raw}
                            disabled={!canEdit}
                            placeholder={canEdit ? column.placeholder : undefined}
                            aria-label={`${column.label}, row ${index + 1}`}
                            aria-invalid={Boolean(error)}
                            className={`min-h-9 w-full rounded-control border bg-surface px-2 py-1.5 text-sm text-text transition placeholder:text-subdued/70 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-text ${
                              error ? "border-danger focus:border-danger" : "border-border focus:border-primary"
                            }`}
                            onChange={(event) => onCellChange(row.key, column.key, event.target.value)}
                          />
                        )}
                        {error ? (
                          <p className="mt-1 text-micro font-medium text-danger" role="alert">
                            {error}
                          </p>
                        ) : null}
                      </td>
                    );
                  })}

                  {canEdit ? (
                    <td className="px-3 py-2">
                      {row.isNew || row.rowId === undefined ? (
                        <button
                          type="button"
                          aria-label={`Remove row ${index + 1}`}
                          title={`Remove row ${index + 1}`}
                          className="inline-flex size-8 items-center justify-center rounded-control text-danger transition hover:bg-danger-soft focus:outline-none focus:ring-2 focus:ring-primary"
                          onClick={() => onRemoveRow(row.key)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      ) : (
                        <RowActions
                          index={index}
                          state={rowActionState[row.key]}
                          disabled={disableRowActions}
                          onUpdate={onUpdateRow ? () => onUpdateRow(row.key) : undefined}
                          onDelete={onDeleteRow ? () => onDeleteRow(row.key) : undefined}
                        />
                      )}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
          <button type="button" className="preview-button-secondary" onClick={onAddRow}>
            <Plus className="size-4" aria-hidden="true" />
            {addLabel}
          </button>
          <p className="text-micro text-subdued">{addHint}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * If the stored value doesn't match any fetched option (still loading, or a
 * legacy value the current catalog no longer lists), it's kept as a synthetic
 * option so the cell keeps showing/sending it instead of silently blanking out.
 */
function SelectCell({
  column,
  raw,
  canEdit,
  index,
  hasError,
  onChange,
}: {
  column: MasterColumn;
  raw: string;
  canEdit: boolean;
  index: number;
  hasError: boolean;
  onChange: (value: string) => void;
}) {
  const options = column.options ?? [];
  const hasKnownValue = !raw || options.some((option) => option.value === raw);
  const resolvedOptions = hasKnownValue ? options : [{ value: raw, label: raw }, ...options];
  const isDisabled = !canEdit || column.optionsLoading || options.length === 0;

  const placeholder = column.optionsLoading
    ? "Loading options…"
    : options.length === 0
      ? "No options available"
      : "Select…";

  return (
    <select
      value={raw}
      disabled={isDisabled}
      aria-label={`${column.label}, row ${index + 1}`}
      aria-invalid={hasError}
      className={`min-h-9 w-full rounded-control border bg-surface px-2 py-1.5 text-sm text-text transition focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-text ${
        hasError ? "border-danger focus:border-danger" : "border-border focus:border-primary"
      }`}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {resolvedOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RowActions({
  index,
  state,
  disabled,
  onUpdate,
  onDelete,
}: {
  index: number;
  state?: RowActionState;
  disabled: boolean;
  onUpdate?: () => void;
  onDelete?: () => void;
}) {
  const isBusy = state?.status === "busy";
  const isLocked = disabled || isBusy;

  return (
    <div className="min-w-[72px]">
      <div className="flex items-center gap-1">
        {onUpdate ? (
          <button
            type="button"
            aria-label={`Save row ${index + 1}`}
            title={`Save row ${index + 1}`}
            disabled={isLocked}
            className="inline-flex size-8 items-center justify-center rounded-control text-subdued transition hover:bg-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onUpdate}
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            aria-label={`Delete row ${index + 1}`}
            title={`Delete row ${index + 1}`}
            disabled={isLocked}
            className="inline-flex size-8 items-center justify-center rounded-control text-danger transition hover:bg-danger-soft focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {state?.status === "error" && state.message ? (
        <p className="mt-1 text-micro font-medium text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
