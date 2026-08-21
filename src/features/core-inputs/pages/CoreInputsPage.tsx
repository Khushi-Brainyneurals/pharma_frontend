import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getDocumentPreviewRoute, ROUTES } from "../../../app/routing/routes";
import { getApiErrorMessage } from "../../../shared/api/apiError";
import { useAuthStore } from "../../auth/state/auth.store";
import { setCoreInputs } from "../../new-document/api/documents.api";
import type {
  BatchType,
  CommercialMode,
  CreateBmrDocumentResponse,
  SetCoreInputsResponse,
} from "../../new-document/api/documents.types";
import { AppShell } from "../../../app/layout/AppShell";
import { DocumentStepper } from "../../new-document/components/DocumentStepper";
import { useDocumentSelectorData } from "../../new-document/hooks/useDocumentSelectorData";
import { DOCUMENT_SELECTOR_STEPS } from "../../new-document/model/documentSelector.config";
import { FileUploadCard, type FileUploadStatus } from "../components/FileUploadCard";
import { useCoreInputsDraftStore } from "../state/coreInputsDraft.store";

type CoreInputsLocationState = {
  document?: CreateBmrDocumentResponse;
  coreInputsDraft?: CoreInputsFormState;
};

type FileField = "mfc" | "pp" | "otherDoc1" | "otherDoc2" | "otherDoc3";

export interface CoreInputsFormState {
  mfc: File | null;
  pp: File | null;
  otherDoc1: File | null;
  otherDoc2: File | null;
  otherDoc3: File | null;
  batchSize: string;
  batchType: BatchType | "";
  commercialMode: CommercialMode | "";
  headerSize: string;
  footerSize: string;
  footerTemplateNo: string;
}

type CoreInputsErrors = Partial<Record<keyof CoreInputsFormState | "form", string>>;

type FileAttachState = {
  status: FileUploadStatus;
  progress: number;
};

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;

const INITIAL_FORM_STATE: CoreInputsFormState = {
  mfc: null,
  pp: null,
  otherDoc1: null,
  otherDoc2: null,
  otherDoc3: null,
  batchSize: "",
  batchType: "",
  commercialMode: "",
  headerSize: "",
  footerSize: "",
  footerTemplateNo: "",
};

const BATCH_TYPE_OPTIONS = [
  { value: "exhibit", label: "Exhibit" },
  { value: "scale_up", label: "Scale up" },
  { value: "commercial", label: "Commercial" },
];

const COMMERCIAL_MODE_OPTIONS = [
  { value: "revision", label: "Revision" },
  { value: "validation", label: "Validation" },
];

export function CoreInputsPage() {
  const { documentId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { context, isLoading: isLoadingContext } = useDocumentSelectorData(user);
  const state = location.state as CoreInputsLocationState | null;
  const document = state?.document;
  const setStoredDraft = useCoreInputsDraftStore((draftState) => draftState.setDraft);
  const [form, setForm] = useState<CoreInputsFormState>(() => ({
    ...INITIAL_FORM_STATE,
    ...(useCoreInputsDraftStore.getState().drafts[documentId] ?? state?.coreInputsDraft),
  }));
  const [touched, setTouched] = useState<Partial<Record<keyof CoreInputsFormState, boolean>>>({});
  const [fileIssues, setFileIssues] = useState<Partial<Record<FileField, string>>>({});
  const [fileAttachState, setFileAttachState] = useState<Partial<Record<FileField, FileAttachState>>>(
    {},
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SetCoreInputsResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlightRef = useRef(false);
  const uploadTimersRef = useRef<Partial<Record<FileField, number>>>({});

  useEffect(() => {
    setStoredDraft(documentId, form);
  }, [documentId, form, setStoredDraft]);

  useEffect(() => {
    return () => {
      Object.values(uploadTimersRef.current).forEach((timerId) => {
        if (timerId) {
          window.clearTimeout(timerId);
        }
      });
    };
  }, []);

  const errors = useMemo(
    () => validateCoreInputs(form, documentId, fileIssues),
    [documentId, fileIssues, form],
  );
  const hasUploadingFile = Object.values(fileAttachState).some(
    (stateValue) => stateValue?.status === "uploading",
  );
  const visibleErrors = getVisibleErrors(errors, touched, submitAttempted);
  const batchSizeWarning = getBatchSizeWarning(form.batchSize);
  const canSubmit =
    Object.keys(errors).length === 0 && !hasUploadingFile && !isSubmitting && !success;
  const primaryReason = getPrimaryDisabledReason(errors, hasUploadingFile);

  function setFile(field: FileField, file: File | null) {
    window.clearTimeout(uploadTimersRef.current[field]);
    setTouched((current) => ({ ...current, [field]: true }));
    setApiError(null);

    if (!file) {
      setForm((current) => ({ ...current, [field]: null }));
      setFileIssues((current) => ({ ...current, [field]: undefined }));
      setFileAttachState((current) => ({ ...current, [field]: { status: "idle", progress: 0 } }));
      return;
    }

    const validationMessage = getFileRejectionMessage(field, file);
    if (validationMessage) {
      setForm((current) => ({ ...current, [field]: null }));
      setFileIssues((current) => ({ ...current, [field]: validationMessage }));
      setFileAttachState((current) => ({ ...current, [field]: { status: "idle", progress: 0 } }));
      return;
    }

    setForm((current) => ({ ...current, [field]: file }));
    setFileIssues((current) => ({ ...current, [field]: undefined }));
    setFileAttachState((current) => ({
      ...current,
      [field]: { status: "uploading", progress: field === "mfc" ? 62 : 48 },
    }));

    uploadTimersRef.current[field] = window.setTimeout(() => {
      setFileAttachState((current) => ({
        ...current,
        [field]: { status: "attached", progress: 100 },
      }));
    }, 500);
  }

  function handleFieldChange(
    field: keyof Pick<
      CoreInputsFormState,
      | "batchType"
      | "commercialMode"
      | "headerSize"
      | "footerSize"
      | "footerTemplateNo"
    >,
  ) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;

      setForm((current) => ({
        ...current,
        [field]: value,
        ...(field === "batchType" && value !== "commercial" ? { commercialMode: "" } : null),
      }));
      setTouched((current) => ({ ...current, [field]: true }));
      setApiError(null);
    };
  }

  function handleBatchSizeChange(event: ChangeEvent<HTMLInputElement>) {
    const formatted = formatBatchSizeInput(event.target.value);

    setForm((current) => ({ ...current, batchSize: formatted }));
    setTouched((current) => ({ ...current, batchSize: true }));
    setApiError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setApiError(null);

    const nextErrors = validateCoreInputs(form, documentId, fileIssues);
    if (Object.keys(nextErrors).length > 0 || hasUploadingFile || submitInFlightRef.current) {
      return;
    }

    const mfc = form.mfc;
    const pp = form.pp; 
    const batchType = form.batchType;
    const batchSize = parseWholeNumber(form.batchSize);
    const headerSize = parsePositiveNumber(form.headerSize);
    const footerSize = parsePositiveNumber(form.footerSize);

    if (!mfc || !pp || !batchType || batchSize === null || headerSize === null || footerSize === null) {
      return;
    }

    submitInFlightRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await setCoreInputs({
        documentId,
        mfc,
        pp,
        otherDoc1: form.otherDoc1,
        otherDoc2: form.otherDoc2,
        otherDoc3: form.otherDoc3,
        batchSize,
        batchType,
        commercialMode: batchType === "commercial" ? form.commercialMode : "",
        headerSize,
        footerSize,
        footerTemplateNo: form.footerTemplateNo.trim(),
        user: user?.username ?? user?.id,
      });

      setSuccess(response);
      window.setTimeout(() => {
        navigate(getDocumentPreviewRoute(response.document_id), {
          state: { coreInputs: response, coreInputsDraft: form, document },
        });
      }, 450);
    } catch (requestError) {
      setApiError(getApiErrorMessage(requestError, "Unable to save core inputs. Please try again."));
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell user={user} unit={context?.unit ?? null} isLoadingUnit={isLoadingContext}>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <section className="mx-auto rounded-panel border border-border bg-surface shadow-sm">
            <div className="p-5 sm:p-6">
              <DocumentStepper steps={DOCUMENT_SELECTOR_STEPS} activeStepId="inputs" />
            </div>

            <SelectionStrip />

            <form onSubmit={handleSubmit} noValidate>
              <div
                className={`px-5 py-5 sm:px-6 ${isSubmitting ? "pointer-events-none opacity-55" : ""}`}
                aria-busy={isSubmitting}
              >
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-small text-subdued">
                    <FileText className="size-4 text-subdued" aria-hidden="true" />
                    <span>New document - working draft - not yet a controlled record.</span>
                  </div>

                  <div className="space-y-3" aria-live="polite">
                    {apiError ? (
                      <StatusBanner
                        tone="error"
                        title="Could not save core inputs"
                        message={apiError}
                      />
                    ) : null}
                    {success ? (
                      <StatusBanner
                        tone="success"
                        title="Core inputs saved"
                        message="Moving to the page-1 preview step."
                      />
                    ) : null}
                    {visibleErrors.form ? (
                      <StatusBanner
                        tone="error"
                        title="Document unavailable"
                        message={visibleErrors.form}
                      />
                    ) : null}
                  </div>

                  <FileUploadCard
                    label="MFC - Master Formula Card"
                    description="The scanned Master Formula Card. We read it on the next step to build the cover and BOM."
                    helperText="The scanned Master Formula Card. We read it on the next step to build the cover and BOM."
                    file={form.mfc}
                    error={visibleErrors.mfc}
                    isRequired
                    disabled={isSubmitting || Boolean(success)}
                    status={getUploadStatus(fileAttachState.mfc, form.mfc)}
                    progress={fileAttachState.mfc?.progress}
                    onChange={(file) => setFile("mfc", file)}
                  />

                  <FileUploadCard
                    label="Product Permission"
                    description="Authorization to manufacture this product. Required before a BMR can be started."
                    helperText={
                      !form.pp && form.mfc
                        ? "Required - authorization on file."
                        : "Authorization to manufacture this product. Required before a BMR can be started."
                    }
                    file={form.pp}
                    error={visibleErrors.pp}
                    isRequired
                    disabled={isSubmitting || Boolean(success)}
                    status={getUploadStatus(fileAttachState.pp, form.pp)}
                    progress={fileAttachState.pp?.progress}
                    onChange={(file) => setFile("pp", file)}
                  />

                  <OptionalDocuments
                    form={form}
                    visibleErrors={visibleErrors}
                    disabled={isSubmitting || Boolean(success)}
                    fileAttachState={fileAttachState}
                    setFile={setFile}
                  />

                  <TextField
                    id="batch-size"
                    label="Batch size"
                    value={form.batchSize}
                    error={visibleErrors.batchSize}
                    placeholder="1,80,000"
                    isRequired
                    disabled={isSubmitting || Boolean(success)}
                    helper="Enter the batch size as a whole number of tablets."
                    inputMode="numeric"
                    onBlur={() => setTouched((current) => ({ ...current, batchSize: true }))}
                    onChange={handleBatchSizeChange}
                  />

                  <SelectField
                    id="batch-type"
                    label="Batch type"
                    value={form.batchType}
                    options={BATCH_TYPE_OPTIONS}
                    placeholder="Select a batch type..."
                    error={visibleErrors.batchType}
                    isRequired
                    disabled={isSubmitting || Boolean(success)}
                    helper="Sample values - list is per-client configuration."
                    onBlur={() => setTouched((current) => ({ ...current, batchType: true }))}
                    onChange={handleFieldChange("batchType")}
                  />

                  {form.batchType === "commercial" ? (
                    <SelectField
                      id="commercial-mode"
                      label="Commercial mode"
                      value={form.commercialMode}
                      options={COMMERCIAL_MODE_OPTIONS}
                      placeholder="Select commercial mode..."
                      error={visibleErrors.commercialMode}
                      isRequired
                      disabled={isSubmitting || Boolean(success)}
                      helper="Required for commercial batches only."
                      onBlur={() =>
                        setTouched((current) => ({ ...current, commercialMode: true }))
                      }
                      onChange={handleFieldChange("commercialMode")}
                    />
                  ) : null}
                  
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField
                      id="header-size"
                      label="Header size"
                      value={form.headerSize}
                      error={visibleErrors.headerSize}
                      isRequired
                      disabled={isSubmitting || Boolean(success)}
                      helper="Header band size in inches, e.g. 0.25, 0.5, or 1."
                      placeholder="0.5"
                      type="number"
                      min="0"
                      step="any"
                      onBlur={() =>
                        setTouched((current) => ({ ...current, headerSize: true }))
                      }
                      onChange={handleFieldChange("headerSize")}
                    />

                    <TextField
                      id="footer-size"
                      label="Footer size"
                      value={form.footerSize}
                      error={visibleErrors.footerSize}
                      isRequired
                      disabled={isSubmitting || Boolean(success)}
                      helper="Footer band size in inches, e.g. 0.25, 0.5, or 1."
                      placeholder="0.5"
                      type="number"
                      min="0"
                      step="any"
                      onBlur={() =>
                        setTouched((current) => ({ ...current, footerSize: true }))
                      }
                      onChange={handleFieldChange("footerSize")}
                    />
                  </div>
                  <TextField
                    id="footer-template-no"
                    label="Footer template no."
                    value={form.footerTemplateNo}
                    error={visibleErrors.footerTemplateNo}
                    placeholder="F-QA-014"
                    isRequired
                    disabled={isSubmitting || Boolean(success)}
                    helper="The controlled footer template stamped on every page."
                    onBlur={() =>
                      setTouched((current) => ({ ...current, footerTemplateNo: true }))
                    }
                    onChange={handleFieldChange("footerTemplateNo")}
                  />

                  {/* <DisabledTemplateBlock /> */}

                  {batchSizeWarning ? (
                    <StatusBanner tone="warning" title="Batch size check" message={batchSizeWarning} />
                  ) : null}
                </div>
              </div>

              <div className="border-t border-border bg-surface px-5 py-4 sm:px-6">
                <div className="flex max-w-[640px] flex-col gap-3">
                  {isSubmitting ? (
                    <div
                      className="inline-flex min-h-10 items-center gap-3 text-small font-semibold text-text"
                      role="status"
                    >
                      <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                      Saving core inputs... Do not close this tab.
                    </div>
                  ) : (
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                      <button
                        type="submit"
                        className="inline-flex min-h-10 items-center justify-center rounded-control bg-primary px-5 py-2.5 text-small font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-subdued"
                        disabled={!canSubmit}
                      >
                        {success ? "Saved" : "Generate page-1 preview"}
                      </button>
                      <Link
                        className="inline-flex min-h-10 items-center justify-center rounded-control border border-primary bg-white px-5 py-2.5 text-small font-semibold text-primary-dark transition hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        to={ROUTES.statusBoard}
                      >
                        Save & exit
                      </Link>
                    </div>
                  )}

                  {primaryReason && !success ? (
                    <p className="inline-flex items-start gap-2 text-small text-subdued">
                      <Info className="mt-0.5 size-4 shrink-0 text-subdued" aria-hidden="true" />
                      {primaryReason}
                    </p>
                  ) : (
                    <p className="inline-flex items-start gap-2 text-small text-subdued">
                      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      Core inputs are saved here; OCR is not run on this screen.
                    </p>
                  )}
                </div>
              </div>
            </form>
        </section>
      </div>
    </AppShell>
  );
}

function SelectionStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-border bg-surface px-5 py-3 sm:px-6">
      <span className="text-micro font-semibold uppercase tracking-overline text-subdued">
        Selection
      </span>
      <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-muted px-3 py-1.5 font-mono text-micro font-medium text-text">
        <Lock className="size-3.5 text-subdued" aria-hidden="true" />
        Dosage form: Tablet - Document: BMR
      </span>
      <span
        className="inline-flex items-center gap-2 rounded-pill border border-dashed border-border bg-surface px-3 py-1.5 text-micro text-subdued opacity-80"
        title="Planned for a future release. This version supports Tablet BMR only."
      >
        Other dosage forms - BPR - PV - not in this release
      </span>
    </div>
  );
}

function OptionalDocuments({
  form,
  visibleErrors,
  disabled,
  fileAttachState,
  setFile,
}: {
  form: CoreInputsFormState;
  visibleErrors: CoreInputsErrors;
  disabled: boolean;
  fileAttachState: Partial<Record<FileField, FileAttachState>>;
  setFile: (field: FileField, file: File | null) => void;
}) {
  return (
    <details className="rounded-control border border-dashed border-border bg-muted/60 p-4">
      <summary className="cursor-pointer text-small font-semibold text-text">
        Other supporting documents
      </summary>
      <div className="mt-4 grid gap-4">
        <FileUploadCard
          label="Other document 1"
          description="Optional PDF."
          file={form.otherDoc1}
          error={visibleErrors.otherDoc1}
          disabled={disabled}
          status={getUploadStatus(fileAttachState.otherDoc1, form.otherDoc1)}
          progress={fileAttachState.otherDoc1?.progress}
          onChange={(file) => setFile("otherDoc1", file)}
        />
        <FileUploadCard
          label="Other document 2"
          description="Optional PDF."
          file={form.otherDoc2}
          error={visibleErrors.otherDoc2}
          disabled={disabled}
          status={getUploadStatus(fileAttachState.otherDoc2, form.otherDoc2)}
          progress={fileAttachState.otherDoc2?.progress}
          onChange={(file) => setFile("otherDoc2", file)}
        />
        <FileUploadCard
          label="Other document 3"
          description="Optional PDF."
          file={form.otherDoc3}
          error={visibleErrors.otherDoc3}
          disabled={disabled}
          status={getUploadStatus(fileAttachState.otherDoc3, form.otherDoc3)}
          progress={fileAttachState.otherDoc3?.progress}
          onChange={(file) => setFile("otherDoc3", file)}
        />
      </div>
    </details>
  );
}

function TextField({
  id,
  label,
  value,
  error,
  helper,
  placeholder,
  type = "text",
  min,
  step,
  inputMode,
  isRequired,
  disabled,
  onBlur,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  helper: string;
  placeholder?: string;
  type?: "number" | "text";
  min?: string;
  step?: string;
  inputMode?: "numeric" | "decimal";
  isRequired?: boolean;
  disabled?: boolean;
  onBlur: () => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-text">
        {label}
        {isRequired ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        type={type}
        min={min}
        step={step}
        inputMode={inputMode}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`min-h-10 w-full rounded-control border bg-surface px-3 py-2 text-sm text-text shadow-sm transition placeholder:text-subdued/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:text-subdued ${
          error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border"
        }`}
        onBlur={onBlur}
        onChange={onChange}
      />
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-small text-danger-ink">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
          {error}
        </p>
      ) : (
        <p className="text-micro leading-5 text-subdued">{helper}</p>
      )}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  placeholder,
  error,
  helper,
  isRequired,
  disabled,
  onBlur,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  error?: string;
  helper: string;
  isRequired?: boolean;
  disabled?: boolean;
  onBlur: () => void;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-text">
        {label}
        {isRequired ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`min-h-10 w-full rounded-control border bg-surface px-3 py-2 text-sm text-text shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:text-subdued ${
          error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border"
        }`}
        onBlur={onBlur}
        onChange={onChange}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-small text-danger-ink">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
          {error}
        </p>
      ) : (
        <p className="text-micro leading-5 text-subdued">{helper}</p>
      )}
    </div>
  );
}

function DisabledTemplateBlock() {
  return (
    <div className="rounded-control border border-dashed border-border bg-surface p-4 opacity-75 cursor-not-allowed" title="Planned for a future release. This version supports Tablet BMR only.">
      <p className="inline-flex items-center gap-2 text-micro font-semibold uppercase tracking-overline text-subdued">
        <Lock className="size-3.5" aria-hidden="true" />
        Not in this release - richer header/footer template
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {["Document no.", "Effective date", "Page x of y", "Supersedes"].map((label) => (
          <label key={label} className="space-y-1 text-micro font-medium text-subdued">
            <span>{label}</span>
            <input
              disabled
              className="min-h-10 w-full rounded-control border border-border bg-muted px-3 py-2"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function StatusBanner({
  tone,
  title,
  message,
}: {
  tone: "success" | "error" | "warning";
  title: string;
  message: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : ShieldCheck;
  const classes = {
    success: "border-success/25 bg-approved-bg text-approved-fg",
    error: "border-danger/20 bg-danger-soft text-danger-ink",
    warning: "border-draft-fg/25 bg-draft-bg text-draft-fg",
  }[tone];

  return (
    <div className={`flex items-start gap-3 rounded-control border px-4 py-3 ${classes}`} role="status">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="text-small leading-5">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5">{message}</p>
      </div>
    </div>
  );
}

function validateCoreInputs(
  form: CoreInputsFormState,
  documentId: string,
  fileIssues: Partial<Record<FileField, string>>,
): CoreInputsErrors {
  const errors: CoreInputsErrors = {};

  if (!documentId.trim()) {
    errors.form = "Document ID is missing. Return to New document and create or select a draft.";
  }

  validateFileField(errors, fileIssues, "mfc", form.mfc, "Attach the MFC as a PDF.");
  validateFileField(
    errors,
    fileIssues,
    "pp",
    form.pp,
    "Attach the Product Permission to continue.",
  );
  validateFileField(errors, fileIssues, "otherDoc1", form.otherDoc1);
  validateFileField(errors, fileIssues, "otherDoc2", form.otherDoc2);
  validateFileField(errors, fileIssues, "otherDoc3", form.otherDoc3);

  const batchSize = parseWholeNumber(form.batchSize);
  if (!form.batchSize.trim()) {
    errors.batchSize = "Enter the production batch size.";
  } else if (batchSize === null) {
    errors.batchSize = "Batch size must be a whole number of tablets - no decimals.";
  }

  if (!form.batchType) {
    errors.batchType = "Select a batch type.";
  }

  if (form.batchType === "commercial" && !form.commercialMode) {
    errors.commercialMode = "Select a commercial mode.";
  }

  if (!form.headerSize.trim()) {
    errors.headerSize = "Enter the header size.";
  } else if (parsePositiveNumber(form.headerSize) === null) {
    errors.headerSize = "Enter a valid header size in inches.";
  }

  if (!form.footerSize.trim()) {
    errors.footerSize = "Enter the footer size.";
  } else if (parsePositiveNumber(form.footerSize) === null) {
    errors.footerSize = "Enter a valid footer size in inches.";
  }

  if (!form.footerTemplateNo.trim()) {
    errors.footerTemplateNo = "Enter the footer template number (e.g. F-QA-014).";
  }

  return errors;
}

function validateFileField(
  errors: CoreInputsErrors,
  fileIssues: Partial<Record<FileField, string>>,
  field: FileField,
  file: File | null,
  requiredMessage?: string,
) {
  if (fileIssues[field]) {
    errors[field] = fileIssues[field];
    return;
  }

  if (!file && requiredMessage) {
    errors[field] = requiredMessage;
  }
}

function getFileRejectionMessage(field: FileField, file: File) {
  if (!isPdf(file)) {
    if (field === "mfc") {
      return `The MFC must be a PDF. You attached ${file.name}. Re-attach the scanned MFC as a PDF.`;
    }

    if (field === "pp") {
      return `The Product Permission must be a PDF. You attached ${file.name}. Re-attach it as a PDF.`;
    }

    return `${file.name} must be a PDF. Remove it or attach a PDF.`;
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return `${file.name} is ${formatRoundedMb(file.size)} MB. The limit is 20 MB - compress or re-scan and try again.`;
  }

  return null;
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().trim().endsWith(".pdf");
}

/**
 * Formats a Batch size input as the user types: strips everything but digits
 * (drops manually-typed commas and blocks decimal points, so "18.25" becomes
 * "1825" rather than being accepted as a fraction) then re-groups using the
 * Indian numbering system (2s after the first 3 digits from the right), e.g.
 * "180000" -> "1,80,000". The stored/displayed value keeps these commas -
 * `parseWholeNumber` already strips them back out for submission/validation.
 */
function formatBatchSizeInput(rawValue: string): string {
  const digitsOnly = rawValue.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }
  return Number(digitsOnly).toLocaleString("en-IN");
}

function parseWholeNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) {
    return null;
  }

  const numberValue = Number(normalized);
  if (!Number.isFinite(numberValue) || numberValue <= 0 || !Number.isInteger(numberValue)) {
    return null;
  }

  return numberValue;
}

function parsePositiveNumber(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const numberValue = Number(normalized);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

function getBatchSizeWarning(value: string) {
  const parsed = parseWholeNumber(value);

  if (parsed !== null && parsed >= 5_000_000) {
    return `Batch size ${parsed.toLocaleString("en-IN")} is unusually large - confirm this is correct.`;
  }

  return null;
}

function getUploadStatus(state: FileAttachState | undefined, file: File | null): FileUploadStatus {
  if (state?.status) {
    return state.status;
  }

  return file ? "attached" : "idle";
}

function getVisibleErrors(
  errors: CoreInputsErrors,
  touched: Partial<Record<keyof CoreInputsFormState, boolean>>,
  submitAttempted: boolean,
) {
  if (submitAttempted) {
    return errors;
  }

  return Object.fromEntries(
    Object.entries(errors).filter(
      ([field]) => field === "form" || touched[field as keyof CoreInputsFormState],
    ),
  ) as CoreInputsErrors;
}

function getPrimaryDisabledReason(errors: CoreInputsErrors, hasUploadingFile: boolean) {
  if (hasUploadingFile) {
    return "Finish attaching the selected PDF before continuing.";
  }

  if (errors.form) {
    return errors.form;
  }

  if (errors.pp) {
    return "Attach the Product Permission to continue. A BMR cannot proceed without authorization on file.";
  }

  if (errors.mfc) {
    return "Attach the MFC as a PDF (max 20 MB) to continue.";
  }

  if (
    errors.batchSize ||
    errors.batchType ||
    errors.commercialMode ||
    errors.headerSize ||
    errors.footerSize ||
    errors.footerTemplateNo
  ) {
    return "Complete the required fields to continue.";
  }

  if (errors.otherDoc1 || errors.otherDoc2 || errors.otherDoc3) {
    return "Attach valid PDFs for optional supporting documents, or remove them.";
  }

  return null;
}

function formatRoundedMb(bytes: number) {
  return Math.round(bytes / (1024 * 1024)).toLocaleString();
}
