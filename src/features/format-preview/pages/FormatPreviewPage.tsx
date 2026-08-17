import axios from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Download,
  FileQuestion,
  FileSearch,
  FileText,
  LockKeyhole,
  Pencil,
  RefreshCw,
  RotateCcw,
  ServerOff,
  Settings2,
  ShieldX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getCoverBomRoute, getDocumentInputsRoute, ROUTES } from "../../../app/routing/routes";
import { USER_ROLES, USER_ROLE_LABELS } from "../../auth/model/roles";
import { useAuthStore } from "../../auth/state/auth.store";
import { AppShell } from "../../../app/layout/AppShell";
import { DocumentStepper } from "../../new-document/components/DocumentStepper";
import { useDocumentSelectorData } from "../../new-document/hooks/useDocumentSelectorData";
import { DOCUMENT_SELECTOR_STEPS } from "../../new-document/model/documentSelector.config";
import { fetchFormatPreview } from "../api/formatPreview.api";
import { DocxPreview } from "../components/DocxPreview";
import { PreviewSkeleton } from "../components/PreviewSkeleton";
import { PreviewStateCard } from "../components/PreviewStateCard";
import type { PreviewDocument, PreviewRequestError } from "../model/formatPreview.types";

interface PreviewLocationState {
  coreInputs?: unknown;
  coreInputsDraft?: unknown;
  document?: unknown;
}

export function FormatPreviewPage() {
  const { documentId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as PreviewLocationState | null;
  const user = useAuthStore((state) => state.user);
  const { context, isLoading: isLoadingContext } = useDocumentSelectorData(user);
  const canAuthor = user?.role === USER_ROLES.PREPARED_BY;
  const [document, setDocument] = useState<PreviewDocument | null>(null);
  const documentRef = useRef<PreviewDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [requestError, setRequestError] = useState<PreviewRequestError | null>(null);
  const [exceptionsAccepted, setExceptionsAccepted] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  const loadPreview = useCallback(async () => {
    if (!documentId || !canAuthor) return;
    const sequence = ++requestSequence.current;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setIsLoading(true);
    setIsDocumentReady(false);
    setRequestError(null);
    setExceptionsAccepted(false);

    try {
      const nextDocument = await fetchFormatPreview(documentId, controller.signal);
      if (sequence !== requestSequence.current) {
        URL.revokeObjectURL(nextDocument.objectUrl);
        return;
      }
      if (documentRef.current) URL.revokeObjectURL(documentRef.current.objectUrl);
      documentRef.current = nextDocument;
      setDocument(nextDocument);
    } catch (error) {
      if (axios.isCancel(error) || sequence !== requestSequence.current) return;
      const normalized = error as PreviewRequestError;
      // A 401 also flips the global session-expired flag (httpClient response
      // interceptor), which shows the app-wide Session Timeout Overlay on top of this page.
      setRequestError(normalized);
      if (documentRef.current) URL.revokeObjectURL(documentRef.current.objectUrl);
      documentRef.current = null;
      setDocument(null);
    } finally {
      if (sequence === requestSequence.current) {
        setIsLoading(false);
        requestControllerRef.current = null;
      }
    }
  }, [canAuthor, documentId]);

  useEffect(() => {
    void loadPreview();
    return () => {
      requestSequence.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [loadPreview]);

  useEffect(() => () => {
    if (documentRef.current) URL.revokeObjectURL(documentRef.current.objectUrl);
  }, []);

  const handleDocumentReady = useCallback((ready: boolean) => {
    setIsDocumentReady(ready);
  }, []);

  function handleEditInputs() {
    navigate(getDocumentInputsRoute(documentId), {
      state: {
        documentId,
        previewStale: true,
        from: location.pathname,
        coreInputs: routeState?.coreInputs,
        coreInputsDraft: routeState?.coreInputsDraft,
        document: routeState?.document,
      },
    });
  }

  const hasWarnings = Boolean(document?.extractionWarnings.length);
  const canProceed = Boolean(
    canAuthor && document && isDocumentReady && (!hasWarnings || exceptionsAccepted),
  );

  return (
    <AppShell user={user} unit={context?.unit ?? null} isLoadingUnit={isLoadingContext}>
      
      <div className="sticky top-0 z-10  border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8 ">
        <div className="mx-auto px-1">
          <DocumentStepper steps={DOCUMENT_SELECTOR_STEPS} activeStepId="preview" />
        </div>
      </div>
      <div className="border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <p className="text-micro font-semibold uppercase tracking-overline text-primary-dark">Step 3 of 7</p>
            <h1 className="mt-1 text-h1 font-semibold text-text">Page-1 preview</h1>
            <p className="mt-1 text-small text-subdued">Review the generated Word document before building the cover and bill of materials.</p>
          </div>
          {/* <span className="rounded-pill border border-border bg-surface px-3 py-1 font-mono text-mono-sm text-subdued">{documentId || "No document ID"}</span>
          <span className="rounded-pill bg-draft-bg px-3 py-1 text-micro font-semibold uppercase tracking-overline text-draft-fg">Draft</span> */}
        </div>
      </div>

      {!canAuthor ? (
            <PreviewStateCard
              icon={ShieldX}
              title="Permission denied"
              message="This document-authoring workflow is available to Prepared By users only."
              tone="permission"
              detail={<><strong className="text-text">Signed in:</strong> {user?.displayName ?? user?.username ?? user?.id ?? "Unknown user"}<br /><strong className="text-text">Role:</strong> {user ? USER_ROLE_LABELS[user.role] : "Unknown"}</>}
              actions={<button type="button" className="preview-button-secondary" onClick={() => navigate(ROUTES.statusBoard)}><ArrowLeft className="size-4" aria-hidden="true" />Back to dashboard</button>}
            />
          ) : isLoading ? (
            <div className="px-5 py-8 sm:px-8"><PreviewSkeleton /></div>
          ) : requestError ? (
            <ErrorState error={requestError} adminNotice={adminNotice} onRetry={() => void loadPreview()} onEditInputs={handleEditInputs} onNotifyAdmin={() => setAdminNotice("Notification could not be sent because no administrator-notification endpoint is configured. Please contact your Admin directly.")} onDashboard={() => navigate(ROUTES.statusBoard)} onNewDocument={() => navigate(ROUTES.newDocument)} />
          ) : document ? (
            <>
            <div className="px-4 py-6 sm:px-6 lg:px-8">
              {hasWarnings ? (
                <div className="mx-auto mb-4 max-w-[1100px] rounded-card border border-draft-fg/30 bg-draft-bg px-4 py-3" role="alert">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-draft-fg" aria-hidden="true" />
                    <div>
                      <h2 className="text-small font-semibold text-text">Some expected values were not found</h2>
                      <p className="mt-1 text-small text-subdued">Return to Core inputs to correct them, or review and accept that they will remain blank.</p>
                      <ul className="mt-2 list-disc pl-5 text-small text-text">{document.extractionWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                      <label className="mt-3 flex cursor-pointer items-start gap-2 text-small font-medium text-text"><input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" checked={exceptionsAccepted} onChange={(event) => setExceptionsAccepted(event.target.checked)} />I have reviewed these exceptions and accept the blank values.</label>
                    </div>
                  </div>
                </div>
              ) : null}

              <section className="mx-auto overflow-hidden rounded-panel border border-border bg-surface shadow-sm" aria-label="Page-1 Word document">
                <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                  <FileText className="size-4 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-small font-semibold text-text">{document.filename}</span>
                  <span className="text-micro text-subdued">{formatFileSize(document.size)}</span>
                </div>
                <DocxPreview document={document} onReadyChange={handleDocumentReady} />
              </section>
            </div>
            <div className="mx-auto mt-4 flex flex-wrap items-center gap-3 border-t border-border bg-surface p-3">
                <span className="mr-auto inline-flex items-center gap-2 text-small text-subdued"><CheckCircle2 className="size-4 text-success" aria-hidden="true" />Preview generated from the latest saved Core inputs</span>
                <a href={document.objectUrl} download={document.filename} className="preview-button-secondary"><Download className="size-4" aria-hidden="true" />Download DOCX</a>
                <button type="button" className="preview-button-secondary" onClick={handleEditInputs}><Pencil className="size-4" aria-hidden="true" />Edit inputs</button>
                <button type="button" className="preview-button-primary" disabled={!canProceed} title={!canProceed ? "Wait for the returned document to render and review any extraction exceptions." : undefined} onClick={() => navigate(getCoverBomRoute(documentId), { state: { documentId, previewVersion: document.etag ?? document.documentKey, coreInputsDraft: routeState?.coreInputsDraft } })}>Proceed to Cover + BOM<ArrowRight className="size-4" aria-hidden="true" /></button>
            </div>
            </>
          ) : (
            <PreviewStateCard icon={FileQuestion} title="No preview yet" message="Generate a Page-1 preview from the saved Core inputs before continuing." actions={<button type="button" className="preview-button-primary" onClick={() => void loadPreview()}><FileSearch className="size-4" aria-hidden="true" />Generate preview</button>} />
          )}
    </AppShell>
  );
}

interface ErrorStateProps {
  error: PreviewRequestError;
  adminNotice: string | null;
  onRetry: () => void;
  onEditInputs: () => void;
  onNotifyAdmin: () => void;
  onDashboard: () => void;
  onNewDocument: () => void;
}

function ErrorState({ error, adminNotice, onRetry, onEditInputs, onNotifyAdmin, onDashboard, onNewDocument }: ErrorStateProps) {
  if (error.kind === "empty") return <PreviewStateCard icon={FileQuestion} title="No preview yet" message="Generate a Page-1 preview from the saved Core inputs before continuing." actions={<><button type="button" className="preview-button-primary" onClick={onRetry}><FileSearch className="size-4" aria-hidden="true" />Generate preview</button><button type="button" className="preview-button-secondary" onClick={onEditInputs}><Pencil className="size-4" aria-hidden="true" />Edit inputs</button></>} />;
  if (error.kind === "mfc-unreadable") return <PreviewStateCard icon={FileSearch} title="We couldn’t read the uploaded MFC" message={error.message} tone="danger" detail={error.uploadedFilename ? <>Uploaded file: <strong className="text-text">{error.uploadedFilename}</strong></> : undefined} actions={<button type="button" className="preview-button-primary" onClick={onEditInputs}><ArrowLeft className="size-4" aria-hidden="true" />Re-upload MFC in Core inputs</button>} />;
  if (error.kind === "company-configuration") return <PreviewStateCard icon={Settings2} title="Company letterhead isn’t configured" message={error.message} tone="warning" detail={adminNotice ?? "Logo, standard font, header, and footer are controlled by an administrator."} actions={<><button type="button" className="preview-button-secondary" onClick={onNotifyAdmin}><BellRing className="size-4" aria-hidden="true" />Notify Admin</button><button type="button" className="preview-button-secondary" onClick={onEditInputs}><ArrowLeft className="size-4" aria-hidden="true" />Back</button></>} />;
  if (error.kind === "forbidden") return <PreviewStateCard icon={LockKeyhole} title="Access forbidden" message={error.message} tone="permission" actions={<button type="button" className="preview-button-secondary" onClick={onDashboard}><ArrowLeft className="size-4" aria-hidden="true" />Back to dashboard</button>} />;
  if (error.kind === "not-found") return <PreviewStateCard icon={FileQuestion} title="Document not found" message={error.message} tone="danger" actions={<button type="button" className="preview-button-secondary" onClick={onNewDocument}><ArrowLeft className="size-4" aria-hidden="true" />Start a new document</button>} />;
  if (error.kind === "version-conflict") return <PreviewStateCard icon={RotateCcw} title="A newer version exists" message={error.message} tone="warning" actions={<button type="button" className="preview-button-primary" onClick={onRetry}><RefreshCw className="size-4" aria-hidden="true" />Reload latest version</button>} />;
  return <PreviewStateCard icon={ServerOff} title="Preview service unavailable" message={error.message} tone="danger" detail="Your saved Core inputs remain unchanged." actions={<><button type="button" className="preview-button-primary" onClick={onRetry}><RefreshCw className="size-4" aria-hidden="true" />Retry</button><button type="button" className="preview-button-secondary" onClick={onEditInputs}><Pencil className="size-4" aria-hidden="true" />Edit inputs</button></>} />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
