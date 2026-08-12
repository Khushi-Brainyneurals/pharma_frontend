import { CheckCircle2, ImageOff, Loader2, Save, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "../../../shared/ui/Input";
import { MASTER_DATA_ROUTES } from "../../../app/routing/routes";
import { useAuthStore } from "../../auth/state/auth.store";
import {
  decideCompanyApproval,
  getCompanyApproval,
  getCompanyInfo,
  getCompanyLogo,
  submitCompanyApproval,
  updateCompanyInfo,
  uploadCompanyLogo,
} from "../api/companyInfo.api";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { CompanyInfo, UpdateCompanyInfoPayload } from "../api/masterData.types";
import { ApprovalPanel } from "../components/ApprovalPanel";
import { MasterDataBanner } from "../components/MasterDataBanner";
import { MasterDataShell } from "../components/MasterDataShell";
import { useApproval } from "../hooks/useApproval";
import { LOGO_ACCEPT, validateLogoFile } from "../model/masterData.config";
import { getEditability, getMasterDataPermissions } from "../model/masterData.permissions";

interface CompanyDraft {
  company_name: string;
  font_name: string;
  font_size: string;
  line_spacing: string;
}

type DraftErrors = Partial<Record<keyof CompanyDraft, string>>;

const EMPTY_DRAFT: CompanyDraft = {
  company_name: "",
  font_name: "",
  font_size: "",
  line_spacing: "",
};

const FIELD_LABELS: Record<string, string> = {
  company_name: "Company name",
  logo_path: "Logo",
  font_name: "Font name",
  font_size: "Font size",
  line_spacing: "Line spacing",
};

export function CompanyInfoPage() {
  const user = useAuthStore((state) => state.user);
  const permissions = useMemo(() => getMasterDataPermissions(user?.role), [user?.role]);

  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [draft, setDraft] = useState<CompanyDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLockedByServer, setIsLockedByServer] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLogoLoading, setIsLogoLoading] = useState(true);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoObjectUrl = useRef<string | null>(null);
  const saveInFlight = useRef(false);

  const applyInfo = useCallback((next: CompanyInfo) => {
    setInfo(next);
    setDraft({
      company_name: next.company_name ?? "",
      font_name: next.font_name ?? "",
      font_size: next.font_size == null ? "" : String(next.font_size),
      line_spacing: next.line_spacing == null ? "" : String(next.line_spacing),
    });
  }, []);

  const loadInfo = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        applyInfo(await getCompanyInfo(signal));
        setLoadError(null);
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        const normalized = await normalizeMasterDataError(error, "Unable to load company information.");
        setLoadError(normalized.message);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [applyInfo],
  );

  const loadLogo = useCallback(async (signal?: AbortSignal) => {
    setIsLogoLoading(true);
    try {
      const blob = await getCompanyLogo(signal);

      if (signal?.aborted) {
        return;
      }

      if (logoObjectUrl.current) {
        URL.revokeObjectURL(logoObjectUrl.current);
      }

      if (blob.size === 0) {
        setLogoUrl(null);
        setLogoError(null);
        return;
      }

      logoObjectUrl.current = URL.createObjectURL(blob);
      setLogoUrl(logoObjectUrl.current);
      setLogoError(null);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      const normalized = await normalizeMasterDataError(error, "Unable to load the company logo.");
      setLogoUrl(null);
      // A missing logo is an expected empty state, not a failure to report.
      setLogoError(normalized.kind === "not-found" ? null : normalized.message);
    } finally {
      if (!signal?.aborted) {
        setIsLogoLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadInfo(controller.signal);
    void loadLogo(controller.signal);
    return () => controller.abort();
  }, [loadInfo, loadLogo]);

  useEffect(
    () => () => {
      if (logoObjectUrl.current) {
        URL.revokeObjectURL(logoObjectUrl.current);
      }
    },
    [],
  );

  const approvalApi = useMemo(
    () => ({
      load: getCompanyApproval,
      submit: submitCompanyApproval,
      decide: decideCompanyApproval,
    }),
    [],
  );

  const onApprovalChanged = useCallback(() => {
    setIsLockedByServer(false);
    void loadInfo();
  }, [loadInfo]);

  const approval = useApproval(approvalApi, onApprovalChanged);
  const editability = getEditability({
    permissions,
    approval: approval.approval,
    isLockedByServer,
  });

  const missing = info?.missing ?? [];
  const isDirty = useMemo(() => Object.keys(changedFields(info, draft)).length > 0, [draft, info]);

  function change<K extends keyof CompanyDraft>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice(null);
  }

  async function save() {
    if (saveInFlight.current) {
      return;
    }

    const nextErrors = validate(draft);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    const payload = changedFields(info, draft);

    if (Object.keys(payload).length === 0) {
      setNotice("No changes to save.");
      return;
    }

    saveInFlight.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      applyInfo(await updateCompanyInfo({ ...payload, user: user?.username ?? user?.id }));
      setNotice("Company information saved.");
      setIsLockedByServer(false);
      await approval.reload();
    } catch (error) {
      const normalized = await normalizeMasterDataError(error, "Unable to save company information.");
      setSaveError(normalized.message);
      if (normalized.kind === "locked") {
        setIsLockedByServer(true);
      }
    } finally {
      saveInFlight.current = false;
      setIsSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    const validationError = validateLogoFile(file);

    if (validationError) {
      setLogoError(validationError);
      return;
    }

    setIsUploadingLogo(true);
    setLogoError(null);

    try {
      applyInfo(await uploadCompanyLogo(file));
      await loadLogo();
      setNotice("Logo uploaded.");
      setIsLockedByServer(false);
      await approval.reload();
    } catch (error) {
      const normalized = await normalizeMasterDataError(error, "Unable to upload the company logo.");
      setLogoError(normalized.message);
      if (normalized.kind === "locked") {
        setIsLockedByServer(true);
      }
    } finally {
      setIsUploadingLogo(false);
    }
  }

  return (
    <MasterDataShell
      title="Master data"
      heading="Company information"
      description="The company identity and typography applied to the header of every generated document."
      crumbs={[{ label: "Master data", to: MASTER_DATA_ROUTES.hub }, { label: "Company information" }]}
    >
      {loadError ? (
        <MasterDataBanner
          tone="error"
          message={loadError}
          className="mb-5"
          actions={
            <button type="button" className="preview-button-secondary min-h-8 px-3" onClick={() => void loadInfo()}>
              Retry
            </button>
          }
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-panel border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <h2 className="mr-auto text-h3 font-semibold">Company standard</h2>
            {info?.is_complete ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-approved-bg px-2.5 py-1 text-micro font-semibold text-approved-fg">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Complete
              </span>
            ) : (
              <span className="rounded-pill bg-draft-bg px-2.5 py-1 text-micro font-semibold text-draft-fg">
                Incomplete
              </span>
            )}
          </div>

          <div className="space-y-5 px-5 py-5">
            {missing.length ? (
              <MasterDataBanner
                tone="locked"
                message={`Missing before documents can be generated: ${missing
                  .map((field) => FIELD_LABELS[field] ?? field)
                  .join(", ")}.`}
              />
            ) : null}

            {saveError ? <MasterDataBanner tone="error" message={saveError} /> : null}
            {notice ? <MasterDataBanner tone="success" message={notice} /> : null}
            {editability.reason ? <MasterDataBanner tone="locked" message={editability.reason} /> : null}

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-control bg-muted" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      id="company-name"
                      label="Company name"
                      value={draft.company_name}
                      error={errors.company_name}
                      isRequired
                      disabled={!editability.canEdit || isSaving}
                      placeholder="Registered company name"
                      onChange={(event) => change("company_name", event.target.value)}
                    />
                  </div>
                  <Input
                    id="company-font-name"
                    label="Font name"
                    value={draft.font_name}
                    error={errors.font_name}
                    disabled={!editability.canEdit || isSaving}
                    placeholder="e.g. Cambria"
                    onChange={(event) => change("font_name", event.target.value)}
                  />
                  <Input
                    id="company-font-size"
                    label="Font size"
                    type="number"
                    step="0.5"
                    min="6"
                    max="72"
                    value={draft.font_size}
                    error={errors.font_size}
                    disabled={!editability.canEdit || isSaving}
                    placeholder="e.g. 12"
                    onChange={(event) => change("font_size", event.target.value)}
                  />
                  <Input
                    id="company-line-spacing"
                    label="Line spacing"
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="4"
                    value={draft.line_spacing}
                    error={errors.line_spacing}
                    disabled={!editability.canEdit || isSaving}
                    placeholder="e.g. 1.0"
                    onChange={(event) => change("line_spacing", event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-micro text-subdued">
                    {info?.updated_at ? `Last updated ${formatDate(info.updated_at)}` : "Not saved yet"}
                  </p>
                  {editability.canEdit ? (
                    <button
                      type="button"
                      className="preview-button-primary"
                      disabled={isSaving || !isDirty}
                      onClick={() => void save()}
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="size-4" aria-hidden="true" />
                      )}
                      Save changes
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-panel border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-h3 font-semibold">Company logo</h2>
              <p className="mt-1 text-small text-subdued">PNG only - printed on every document header.</p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex min-h-32 items-center justify-center rounded-control border border-dashed border-border bg-muted p-4">
                {isLogoLoading ? (
                  <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Current company logo"
                    className="max-h-28 max-w-full object-contain"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-center text-small text-subdued">
                    <ImageOff className="size-6" aria-hidden="true" />
                    No logo uploaded yet.
                  </span>
                )}
              </div>

              {logoError ? <MasterDataBanner tone="error" message={logoError} /> : null}

              {editability.canEdit ? (
                <label
                  className={`preview-button-secondary w-full ${
                    isUploadingLogo ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="size-4" aria-hidden="true" />
                  )}
                  {logoUrl ? "Replace logo" : "Upload logo"}
                  <input
                    type="file"
                    accept={LOGO_ACCEPT}
                    className="sr-only"
                    disabled={isUploadingLogo}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) {
                        void uploadLogo(file);
                      }
                    }}
                  />
                </label>
              ) : null}
            </div>
          </section>

          <ApprovalPanel
            title="Approval"
            description="Company information is signed off by the Approver before it is used."
            controller={approval}
            editability={editability}
            submitBlockedReason={
              info?.is_complete ? null : "Complete every required field before submitting for approval."
            }
          />
        </div>
      </div>
    </MasterDataShell>
  );
}

function validate(draft: CompanyDraft): DraftErrors {
  const errors: DraftErrors = {};

  if (!draft.company_name.trim()) {
    errors.company_name = "Company name is required.";
  }

  const fontSize = Number(draft.font_size);
  if (draft.font_size.trim() && (!Number.isFinite(fontSize) || fontSize <= 0)) {
    errors.font_size = "Enter a valid font size.";
  }

  const lineSpacing = Number(draft.line_spacing);
  if (draft.line_spacing.trim() && (!Number.isFinite(lineSpacing) || lineSpacing <= 0)) {
    errors.line_spacing = "Enter a valid line spacing.";
  }

  return errors;
}

/** Only the fields the user actually changed are sent to PUT. */
function changedFields(info: CompanyInfo | null, draft: CompanyDraft): UpdateCompanyInfoPayload {
  const payload: UpdateCompanyInfoPayload = {};

  if (draft.company_name.trim() !== (info?.company_name ?? "")) {
    payload.company_name = draft.company_name.trim();
  }

  if (draft.font_name.trim() !== (info?.font_name ?? "")) {
    payload.font_name = draft.font_name.trim();
  }

  const fontSize = draft.font_size.trim() ? Number(draft.font_size) : null;
  if (fontSize !== (info?.font_size ?? null)) {
    payload.font_size = fontSize;
  }

  const lineSpacing = draft.line_spacing.trim() ? Number(draft.line_spacing) : null;
  if (lineSpacing !== (info?.line_spacing ?? null)) {
    payload.line_spacing = lineSpacing;
  }

  return payload;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
