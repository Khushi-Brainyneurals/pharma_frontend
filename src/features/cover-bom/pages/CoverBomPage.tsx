import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileQuestion,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  ServerOff,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getSelectStagesRoute, ROUTES } from "../../../app/routing/routes";
import { USER_ROLES } from "../../auth/model/roles";
import { useAuthStore } from "../../auth/state/auth.store";
import { PreviewSkeleton } from "../../format-preview/components/PreviewSkeleton";
import { PreviewStateCard } from "../../format-preview/components/PreviewStateCard";
import { SessionTimeoutOverlay } from "../../format-preview/components/SessionTimeoutOverlay";
import { AppHeader } from "../../new-document/components/AppHeader";
import { AppSidebar } from "../../new-document/components/AppSidebar";
import { DocumentStepper } from "../../new-document/components/DocumentStepper";
import { useDocumentSelectorData } from "../../new-document/hooks/useDocumentSelectorData";
import { DOCUMENT_SELECTOR_STEPS } from "../../new-document/model/documentSelector.config";
import { BomEditor } from "../components/BomEditor";
import { BomGenerationForm } from "../components/BomGenerationForm";
import { CoverBomDocumentViewer } from "../components/CoverBomDocumentViewer";
import { useCoverBomController } from "../hooks/useCoverBomController";
import type { CoverBomRequestError } from "../model/coverBom.types";

export function CoverBomPage() {
  const { documentId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const { context, isLoading: isLoadingContext } = useDocumentSelectorData(user);
  const canAuthor = user?.role === USER_ROLES.PREPARED_BY;
  const identity = user?.username ?? user?.id ?? null;
  const controller = useCoverBomController(documentId, canAuthor, identity);
  const { state } = controller;
  const editing = Boolean(state.draft && ["edit", "edit-dirty", "validation-failure", "saving"].includes(state.mode));
  const busyLabel = state.mode === "saving" ? "Saving corrections…" : state.mode === "regenerating" ? "Regenerating DOCX…" : null;

  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(controller.clearToast, 5000);
    return () => window.clearTimeout(timer);
  }, [controller, state.toast]);

  function signInAgain() {
    clearSession();
    navigate(ROUTES.login, { replace: true, state: { from: location, authNotice: { variant: "info", message: "Your session timed out. Sign in again to reopen this Cover + BOM safely." } } });
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <AppHeader user={user} unit={context?.unit ?? null} isLoadingUnit={isLoadingContext} />
      <div className="lg:grid lg:h-[calc(100vh-var(--topbar-h))] lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)] lg:overflow-hidden">
        <AppSidebar user={user} />
        <main className="min-w-0 lg:h-full lg:overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1280px]"><DocumentStepper steps={DOCUMENT_SELECTOR_STEPS} activeStepId="cover-bom" /></div></div>
          <header className="border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-3"><div className="mr-auto"><p className="text-micro font-semibold uppercase tracking-overline text-primary-dark">Step 4 of 7</p><h1 className="mt-1 text-h1 font-semibold">Cover + BOM</h1><p className="mt-1 max-w-3xl text-small text-subdued">Review the backend-generated cover and bill of materials. Corrections are made in the structured table, never inside the Word document.</p></div><div className="flex flex-wrap gap-2"><span className="rounded-pill border border-border bg-surface px-3 py-1 font-mono text-mono-sm text-subdued">{state.data?.bmr_number || documentId || "No document ID"}</span><span className="rounded-pill bg-draft-bg px-3 py-1 text-micro font-semibold uppercase tracking-overline text-draft-fg">Draft</span></div></div></header>

          <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
            {state.mode === "initial-loading" || state.mode === "preview-loading" ? <PreviewSkeleton /> : null}
            {state.mode === "not-generated" || state.mode === "generating" || (state.mode === "validation-failure" && !state.draft) ? <BomGenerationForm busy={state.mode === "generating"} errors={state.errors} onGenerate={(input) => void controller.generate(input)} /> : null}
            {state.mode === "generation-failure" || state.mode === "preview-failure" || state.mode === "version-conflict" ? <CoverBomError error={state.requestError} onRetry={() => void controller.load()} onDashboard={() => navigate(ROUTES.statusBoard)} /> : null}

            {state.data && editing && state.draft ? <BomEditor data={state.data} draft={state.draft} errors={state.errors} disabled={state.mode === "saving"} onChange={controller.updateDraft} /> : null}

            {state.preview && !editing && !["preview-failure", "version-conflict"].includes(state.mode) ? <>
              {state.warnings.length ? <Warnings warnings={state.warnings} /> : null}
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"><FileText className="size-4 text-primary" /><span className="min-w-0 flex-1 truncate text-small font-semibold">{state.preview.filename}</span><span className="text-micro text-subdued">{formatFileSize(state.preview.size)}{state.preview.lastModified ? ` · Updated ${formatDate(state.preview.lastModified)}` : ""}</span></div>
              <CoverBomDocumentViewer document={state.preview} />
            </> : null}
          </div>

          {(state.preview || editing) && !["preview-failure", "version-conflict"].includes(state.mode) ? <div className="sticky bottom-0 z-10 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_-18px_rgba(21,33,46,.45)] backdrop-blur sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3">{busyLabel ? <span className="mr-auto inline-flex items-center gap-2 text-small font-medium text-primary-dark"><Loader2 className="size-4 animate-spin" />{busyLabel}</span> : editing ? <span className="mr-auto text-small text-subdued">{state.mode === "edit-dirty" || state.mode === "validation-failure" ? "Unsaved BOM changes" : "Edit supported fields, then save to regenerate the preview."}</span> : <span className="mr-auto inline-flex items-center gap-2 text-small text-subdued"><CheckCircle2 className="size-4 text-success" />Latest generated version loaded</span>}
            {editing ? <><button type="button" className="preview-button-secondary" disabled={controller.isBusy} onClick={controller.cancelEdit}><X className="size-4" />Cancel</button><button type="button" className="preview-button-primary" disabled={controller.isBusy || state.mode === "edit"} onClick={() => void controller.save()}><Save className="size-4" />Save & regenerate</button></> : <><a href={state.preview?.objectUrl} download={state.preview?.filename} className="preview-button-secondary"><Download className="size-4" />Download DOCX</a><button type="button" className="preview-button-secondary" disabled={!canAuthor || controller.isBusy} onClick={controller.beginEdit}><Pencil className="size-4" />Edit BOM</button><button type="button" className="preview-button-primary" disabled={!controller.canProceed} onClick={() => navigate(getSelectStagesRoute(documentId), { state: { documentId, bomVersion: state.preview?.etag ?? state.preview?.documentKey } })}>Proceed to Select Stages<ArrowRight className="size-4" /></button></>}
          </div></div> : null}
        </main>
      </div>
      {state.toast ? <div className="fixed bottom-20 right-5 z-30 flex max-w-sm items-start gap-3 rounded-card border border-success/25 bg-surface px-4 py-3 text-small text-text shadow-overlay" role="status"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /><span className="flex-1">{state.toast}</span><button type="button" onClick={controller.clearToast} aria-label="Dismiss"><X className="size-4 text-subdued" /></button></div> : null}
      {state.mode === "session-timeout" ? <SessionTimeoutOverlay onSignIn={signInAgain} /> : null}
    </div>
  );
}

function Warnings({ warnings }: { warnings: string[] }) { 
  return <div 
      className="mb-4 rounded-card border border-draft-fg/30 bg-draft-bg px-4 py-3" 
      role="alert"><div className="flex gap-3"><AlertTriangle 
      className="mt-0.5 size-5 shrink-0 text-draft-fg" />
    <div>
      <h2 className="text-small font-semibold">Backend extraction warnings</h2>
      <p className="mt-1 text-small text-subdued">Review these items against the generated document before proceeding.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-small">{warnings.map((warning) => 
        <li key={warning}>{warning}</li>)}
      </ul>
    </div>
    </div></div>; }
function CoverBomError({ error, onRetry, onDashboard }: { error: CoverBomRequestError | null; onRetry: () => void; onDashboard: () => void }) { if (error?.kind === "version-conflict") return <PreviewStateCard icon={RotateCcw} title="A newer BOM version exists" message={error.message} tone="warning" actions={<button type="button" className="preview-button-primary" onClick={onRetry}><RefreshCw className="size-4" />Reload latest version</button>} />; if (error?.kind === "not-found") return <PreviewStateCard icon={FileQuestion} title="Document not found" message={error.message} tone="danger" actions={<button type="button" className="preview-button-secondary" onClick={onDashboard}><ArrowLeft className="size-4" />Back to dashboard</button>} />; return <PreviewStateCard icon={ServerOff} title="Cover + BOM unavailable" message={error?.message ?? "The Cover + BOM service is temporarily unavailable."} tone="danger" actions={<button type="button" className="preview-button-primary" onClick={onRetry}><RefreshCw className="size-4" />Retry</button>} />; }
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); }
