import { CheckCircle2, Eye, KeyRound, Loader2, Pencil, Plus, Search, Trash2, UserRound, X, } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, } from "react";
import { getApiErrorMessage } from "../../../shared/api/apiError";
import { Dialog } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import { PasswordInput } from "../../../shared/ui/PasswordInput";
import { Select } from "../../../shared/ui/Select";
import { USER_ROLE_LABELS, USER_ROLE_OPTIONS, type UserRole, } from "../../auth/model/roles";
import { useAuthStore } from "../../auth/state/auth.store";
import { AppShell } from "../../../app/layout/AppShell";
import { changeEmployeePassword, deleteEmployee, getEmployeeById, getEmployees, registerEmployee, updateEmployee, } from "../api/employee.api";
import type { Employee, RegisterEmployeePayload, UpdateEmployeePayload, } from "../api/employee.types";

type DialogKind = "create" | "edit" | "view" | "password" | "delete" | null;
type EmployeeDraft = Omit<RegisterEmployeePayload, "password"> & {
  password: string;
};
type DraftErrors = Partial<Record<keyof EmployeeDraft, string>>;
const EMPTY_DRAFT: EmployeeDraft = {
  user_id: "",
  roles: [],
  department: "",
  unit: "",
  password: "",
  status: "active",
};

export function EmployeeManagementPage() {
  const user = useAuthStore((state) => state.user);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const detailRequest = useRef(0);
  const actionInFlight = useRef(false);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      setEmployees(await getEmployees());
    } catch (error) {
      setListError(
        getApiErrorMessage(
          error,
          "Unable to load employees. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const statuses = useMemo(
    () =>
      [
        ...new Set(
          employees.map((employee) => employee.status).filter(Boolean),
        ),
      ].sort(),
    [employees],
  );
  const roles = useMemo(
    () => [...new Set(employees.flatMap((employee) => employee.roles))].sort(),
    [employees],
  );
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        [
          employee.user_id,
          employee.department,
          employee.unit,
          ...employee.roles,
        ].some((value) => value.toLowerCase().includes(query));
      return (
        matchesSearch &&
        (!statusFilter || employee.status === statusFilter) &&
        (!roleFilter || employee.roles.includes(roleFilter))
      );
    });
  }, [employees, roleFilter, search, statusFilter]);

  function openDialog(kind: Exclude<DialogKind, null>, employee?: Employee) {
    setActionError(null);
    setSelected(employee ?? null);
    setDialog(kind);
  }
  function closeDialog() {
    if (actionBusy) return;
    detailRequest.current += 1;
    setDialog(null);
    setSelected(null);
    setActionError(null);
    setIsDetailsLoading(false);
  }
  async function openDetails(employee: Employee) {
    openDialog("view");
    setIsDetailsLoading(true);
    const requestId = ++detailRequest.current;
    try {
      const details = await getEmployeeById(employee.user_id);
      if (requestId === detailRequest.current) setSelected(details);
    } catch (error) {
      if (requestId === detailRequest.current)
        setActionError(
          getApiErrorMessage(error, "Unable to load employee details."),
        );
    } finally {
      if (requestId === detailRequest.current) setIsDetailsLoading(false);
    }
  }
  async function handleSave(
    payload: RegisterEmployeePayload | UpdateEmployeePayload,
  ) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActionBusy(true);
    setActionError(null);
    try {
      if (dialog === "create") {
        const response = await registerEmployee(
          payload as RegisterEmployeePayload,
        );
        setEmployees((current) => [response.data, ...current]);
        setToast(response.message || "Employee created successfully.");
      } else if (dialog === "edit" && selected) {
        const response = await updateEmployee(
          selected.user_id,
          payload as UpdateEmployeePayload,
        );
        setEmployees((current) =>
          current.map((item) =>
            item.user_id === selected.user_id ? response.data : item,
          ),
        );
        setToast(response.message || "Employee updated successfully.");
      }
      setDialog(null);
      setSelected(null);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Unable to save the employee."));
    } finally {
      actionInFlight.current = false;
      setActionBusy(false);
    }
  }
  async function handleDelete() {
    if (!selected || actionInFlight.current) return;
    actionInFlight.current = true;
    setActionBusy(true);
    setActionError(null);
    try {
      await deleteEmployee(selected.user_id);
      setEmployees((current) =>
        current.filter((item) => item.user_id !== selected.user_id),
      );
      setToast("Employee deleted successfully.");
      setDialog(null);
      setSelected(null);
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "Unable to delete the employee."),
      );
    } finally {
      actionInFlight.current = false;
      setActionBusy(false);
    }
  }
  async function handlePassword(payload: {
    old_password: string;
    new_password: string;
  }) {
    if (!selected || actionInFlight.current) return;
    actionInFlight.current = true;
    setActionBusy(true);
    setActionError(null);
    try {
      await changeEmployeePassword(selected.user_id, payload);
      setToast("Password changed successfully.");
      setDialog(null);
      setSelected(null);
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "Unable to change the password."),
      );
    } finally {
      actionInFlight.current = false;
      setActionBusy(false);
    }
  }

  return (
    <AppShell user={user} unit={null} title="Employee Management">
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <section className="mx-auto rounded-panel border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-h1 font-semibold">Employee Management</h1>
                <p className="mt-2 text-small text-subdued">
                  Create, view, update and manage company employees.
                </p>
              </div>
              <button
                type="button"
                className="preview-button-primary"
                onClick={() => openDialog("create")}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add Employee
              </button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(240px,1fr)_300px]">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Search employees
                </span>

                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subdued"
                    aria-hidden="true"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search ID, department, unit or role"
                    className="min-h-10 w-full rounded-control border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </label>

              <FilterSelect
                label="Role"
                value={roleFilter}
                onChange={setRoleFilter}
                options={roles}
                allLabel="All roles"
              />
            </div>
            <div className="mt-5 overflow-x-auto rounded-card border border-border">
              {isLoading ? (
                <StateMessage>
                  <Loader2 className="size-5 animate-spin text-primary" />
                  Loading employees…
                </StateMessage>
              ) : listError ? (
                <StateMessage>
                  <span className="text-danger">{listError}</span>
                  <button
                    className="preview-button-secondary"
                    onClick={() => void loadEmployees()}
                  >
                    Retry
                  </button>
                </StateMessage>
              ) : filteredEmployees.length === 0 ? (
                <StateMessage>
                  {employees.length
                    ? "No employees match the selected filters."
                    : "No employees have been added yet."}
                </StateMessage>
              ) : (
                <table className="w-full min-w-[930px] text-left text-small">
                  <thead className="border-b border-border bg-muted text-micro uppercase tracking-overline text-subdued">
                    <tr>
                      {[
                        "User ID",
                        "Roles",
                        "Department",
                        "Unit",
                        "Status",
                        "Created At",
                        "Actions",
                      ].map((heading) => (
                        <th key={heading} className="px-4 py-3 font-semibold">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEmployees.map((employee) => (
                      <EmployeeRow
                        key={employee.user_id}
                        employee={employee}
                        onView={() => void openDetails(employee)}
                        onEdit={() => openDialog("edit", employee)}
                        onPassword={() => openDialog("password", employee)}
                        onDelete={() => openDialog("delete", employee)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
        </section>
      </div>
      {dialog === "create" || dialog === "edit" ? (
        <Dialog
          title={
            dialog === "create"
              ? "Add Employee"
              : `Edit ${selected?.user_id ?? "employee"}`
          }
          busy={actionBusy}
          onClose={closeDialog}
        >
          <EmployeeForm
            employee={dialog === "edit" ? selected : null}
            busy={actionBusy}
            apiError={actionError}
            onSubmit={handleSave}
            onCancel={closeDialog}
          />
        </Dialog>
      ) : null}
      {dialog === "view" ? (
        <Dialog
          title="Employee details"
          busy={isDetailsLoading}
          onClose={closeDialog}
        >
          {isDetailsLoading ? (
            <StateMessage>
              <Loader2 className="size-5 animate-spin text-primary" />
              Loading details…
            </StateMessage>
          ) : actionError ? (
            <ErrorBanner message={actionError} />
          ) : selected ? (
            <EmployeeDetails employee={selected} />
          ) : null}
        </Dialog>
      ) : null}
      {dialog === "password" && selected ? (
        <Dialog
          title={`Change password - ${selected.user_id}`}
          busy={actionBusy}
          onClose={closeDialog}
        >
          <PasswordForm
            busy={actionBusy}
            apiError={actionError}
            onSubmit={handlePassword}
            onCancel={closeDialog}
          />
        </Dialog>
      ) : null}
      {dialog === "delete" && selected ? (
        <Dialog title="Delete employee" busy={actionBusy} onClose={closeDialog}>
          <p className="text-sm leading-6">
            Are you sure you want to delete employee{" "}
            <strong>“{selected.user_id}”</strong>? This action cannot be undone.
          </p>
          {actionError ? <ErrorBanner message={actionError} /> : null}
          <div className="mt-6 flex justify-end gap-3">
            <button
              className="preview-button-secondary"
              disabled={actionBusy}
              onClick={closeDialog}
            >
              Cancel
            </button>
            <button
              className="preview-button-danger"
              disabled={actionBusy}
              onClick={() => void handleDelete()}
            >
              {actionBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete employee
            </button>
          </div>
        </Dialog>
      ) : null}
      {toast ? (
        <div
          className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-card border border-success/25 bg-surface px-4 py-3 text-small shadow-overlay"
          role="status"
        >
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <span className="flex-1">{toast}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X className="size-4 text-subdued" />
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}

function EmployeeRow({
  employee,
  onView,
  onEdit,
  onPassword,
  onDelete,
}: {
  employee: Employee;
  onView: () => void;
  onEdit: () => void;
  onPassword: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-3 font-mono font-semibold">{employee.user_id}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {employee.roles.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </div>
      </td>
      <td className="px-4 py-3">{employee.department}</td>
      <td className="px-4 py-3">{employee.unit}</td>
      <td className="px-4 py-3">
        <StatusBadge status={employee.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-subdued">
        {formatDate(employee.created_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <ActionButton
            label={`View ${employee.user_id}`}
            icon={<Eye />}
            onClick={onView}
          />
          <ActionButton
            label={`Edit ${employee.user_id}`}
            icon={<Pencil />}
            onClick={onEdit}
          />
          <ActionButton
            label={`Change password for ${employee.user_id}`}
            icon={<KeyRound />}
            onClick={onPassword}
          />
          <ActionButton
            label={`Delete ${employee.user_id}`}
            icon={<Trash2 />}
            danger
            onClick={onDelete}
          />
        </div>
      </td>
    </tr>
  );
}

function EmployeeForm({
  employee,
  busy,
  apiError,
  onSubmit,
  onCancel,
}: {
  employee: Employee | null;
  busy: boolean;
  apiError: string | null;
  onSubmit: (
    payload: RegisterEmployeePayload | UpdateEmployeePayload,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EmployeeDraft>(() =>
    employee ? { ...employee, password: "" } : EMPTY_DRAFT,
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const roleOptions = useMemo(
    () => [
      ...USER_ROLE_OPTIONS,
      ...draft.roles
        .filter(
          (role) => !USER_ROLE_OPTIONS.some((option) => option.value === role),
        )
        .map((value) => ({ value, label: value })),
    ],
    [draft.roles],
  );
  function change<K extends keyof EmployeeDraft>(
    key: K,
    value: EmployeeDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = {
      ...draft,
      user_id: draft.user_id.trim(),
      department: draft.department.trim(),
      unit: draft.unit.trim(),
      password: draft.password.trim(),
      status: draft.status.trim(),
    };
    const nextErrors: DraftErrors = {};
    if (!trimmed.user_id) nextErrors.user_id = "User ID is required.";
    if (!trimmed.roles.length) nextErrors.roles = "Select at least one role.";
    if (!trimmed.department) nextErrors.department = "Department is required.";
    if (!trimmed.unit) nextErrors.unit = "Unit is required.";
    if (!employee && !trimmed.password)
      nextErrors.password = "Password is required.";
    if (!trimmed.status) nextErrors.status = "Status is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const { password, ...updatePayload } = trimmed;
    void onSubmit(employee ? updatePayload : { ...updatePayload, password });
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="employee-user-id"
          label="User ID"
          value={draft.user_id}
          error={errors.user_id}
          isRequired
          disabled={busy}
          onChange={(e) => change("user_id", e.target.value)}
        />
        <Input
          id="employee-department"
          label="Department"
          value={draft.department}
          error={errors.department}
          isRequired
          disabled={busy}
          onChange={(e) => change("department", e.target.value)}
        />
        <Input
          id="employee-unit"
          label="Unit"
          value={draft.unit}
          error={errors.unit}
          isRequired
          disabled={busy}
          onChange={(e) => change("unit", e.target.value)}
        />
        <Input
          id="employee-status"
          label="Status"
          value={draft.status}
          error={errors.status}
          isRequired
          disabled={busy}
          onChange={(e) => change("status", e.target.value)}
        />
        {!employee ? (
          <PasswordInput
            id="employee-password"
            label="Password"
            value={draft.password}
            error={errors.password}
            isRequired
            disabled={busy}
            autoComplete="new-password"
            onChange={(e) => change("password", e.target.value)}
          />
        ) : null}
      </div>
      <fieldset disabled={busy}>
        <legend className="text-sm font-semibold">
          Roles <span className="text-danger">*</span>
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {roleOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 rounded-control border border-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={draft.roles.includes(option.value)}
                onChange={(e) =>
                  change(
                    "roles",
                    e.target.checked
                      ? [...draft.roles, option.value]
                      : draft.roles.filter((role) => role !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
        {errors.roles ? (
          <p className="mt-2 text-xs font-medium text-danger" role="alert">
            {errors.roles}
          </p>
        ) : null}
      </fieldset>
      {apiError ? <ErrorBanner message={apiError} /> : null}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="preview-button-secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="preview-button-primary"
          disabled={busy}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {employee ? "Save changes" : "Create employee"}
        </button>
      </div>
    </form>
  );
}

function PasswordForm({
  busy,
  apiError,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  apiError: string | null;
  onSubmit: (payload: {
    old_password: string;
    new_password: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState({ old: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof values, string>>
  >({});
  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!values.old) nextErrors.old = "Old password is required.";
    if (!values.next) nextErrors.next = "New password is required.";
    if (!values.confirm) nextErrors.confirm = "Confirm the new password.";
    else if (values.next !== values.confirm)
      nextErrors.confirm = "Passwords do not match.";
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length)
      void onSubmit({ old_password: values.old, new_password: values.next });
  }
  function change(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <PasswordInput
        id="old-password"
        label="Old Password"
        value={values.old}
        error={errors.old}
        isRequired
        disabled={busy}
        autoComplete="current-password"
        onChange={(e) => change("old", e.target.value)}
      />
      <PasswordInput
        id="new-password"
        label="New Password"
        value={values.next}
        error={errors.next}
        isRequired
        disabled={busy}
        autoComplete="new-password"
        onChange={(e) => change("next", e.target.value)}
      />
      <PasswordInput
        id="confirm-password"
        label="Confirm New Password"
        value={values.confirm}
        error={errors.confirm}
        isRequired
        disabled={busy}
        autoComplete="new-password"
        onChange={(e) => change("confirm", e.target.value)}
      />
      {apiError ? <ErrorBanner message={apiError} /> : null}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="preview-button-secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="preview-button-primary"
          disabled={busy}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}Change
          password
        </button>
      </div>
    </form>
  );
}

function EmployeeDetails({ employee }: { employee: Employee }) {
  const fields = [
    ["User ID", employee.user_id],
    ["Department", employee.department],
    ["Unit", employee.unit],
    ["Status", employee.status],
    ["Created At", formatDate(employee.created_at)],
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-control bg-muted p-3">
            <dt className="text-micro font-semibold uppercase tracking-overline text-subdued">
              {label}
            </dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </div>
      <div>
        <p className="text-micro font-semibold uppercase tracking-overline text-subdued">
          Roles
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {employee.roles.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </div>
      </div>
    </div>
  );
}
function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <Select
      id={`${label.toLowerCase()}-filter`}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options.map((option) => ({
        value: option,
        label: roleLabel(option),
      }))}
      placeholder={allLabel}
    />
  );
}
function ActionButton({
  label,
  icon,
  danger,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-7 items-center justify-center rounded-control transition focus:outline-none focus:ring-2 focus:ring-primary ${danger ? "text-danger hover:bg-danger-soft" : "text-subdued hover:bg-muted hover:text-text"}`}
    >
      <span className="[&>svg]:size-4">{icon}</span>
    </button>
  );
}
function RoleBadge({ role }: { role: string }) {
  return (
    <span className="rounded-pill bg-accent-soft px-2 py-1 text-micro font-semibold text-primary-dark">
      {roleLabel(role)}
    </span>
  );
}
function StatusBadge({ status }: { status: string }) {
  const active = status.toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-micro font-semibold ${active ? "bg-approved-bg text-approved-fg" : "bg-superseded-bg text-superseded-fg"}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status || "Unknown"}
    </span>
  );
}
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="mt-4 rounded-control border border-danger/25 bg-danger-soft px-3 py-2 text-small text-danger-ink"
      role="alert"
    >
      {message}
    </div>
  );
}
function StateMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center text-small text-subdued">
      {children}
    </div>
  );
}
function roleLabel(role: string) {
  return USER_ROLE_LABELS[role as UserRole] ?? role;
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value || "-" : date.toLocaleString();
}
