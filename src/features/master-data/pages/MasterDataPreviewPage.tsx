import { ArrowLeft, ChevronLeft, ChevronRight, Eye, FileText, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getBatchDocumentsRoute,
  getStageDocumentsRoute,
  MASTER_DATA_ROUTES,
} from "../../../app/routing/routes";
import { useAuthStore } from "../../auth/state/auth.store";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { DocumentPreview, MasterDataScope, OtherDocumentsChecklist } from "../api/masterData.types";
import {
  decideStageDocumentsApproval,
  getOtherDocumentsChecklist,
  getStageDocumentsApproval,
  previewOtherDocument,
  previewOtherStageDocument,
  previewStageDocument,
  submitStageDocumentsApproval,
} from "../api/stageDocuments.api";
import { ApprovalPanel } from "../components/ApprovalPanel";
import { DocumentViewer } from "../components/DocumentViewer";
import { MasterDataBanner } from "../components/MasterDataBanner";
import { MasterDataShell } from "../components/MasterDataShell";
import { useApproval } from "../hooks/useApproval";
import { useDocumentPreview } from "../hooks/useDocumentPreview";
import { useStageChecklist } from "../hooks/useStageChecklist";
import { MASTER_DATA_STEPS, scopeLabel, stageLabel } from "../model/masterData.config";
import { getEditability, getMasterDataPermissions } from "../model/masterData.permissions";

interface PreviewEntry {
  key: string;
  title: string;
  group: string;
  code?: string;
  fileName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  load: (signal?: AbortSignal) => Promise<DocumentPreview>;
}

export function MasterDataPreviewPage() {
  const { productType = "", docType = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const permissions = useMemo(() => getMasterDataPermissions(user?.role), [user?.role]);
  const scope = useMemo<MasterDataScope>(() => ({ productType, docType }), [docType, productType]);

  const checklist = useStageChecklist(scope);
  const preview = useDocumentPreview();
  const [batch, setBatch] = useState<OtherDocumentsChecklist | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [previewed, setPreviewed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    getOtherDocumentsChecklist(scope, controller.signal)
      .then((next) => setBatch(next))
      .catch(async (requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const normalized = await normalizeMasterDataError(
          requestError,
          "Unable to load the batch documents.",
        );
        setBatchError(normalized.message);
      });

    return () => controller.abort();
  }, [scope]);

  const entries = useMemo<PreviewEntry[]>(() => {
    const list: PreviewEntry[] = [];

    for (const stage of checklist.stages) {
      const group = stageLabel(stage.stage_key);

      for (const slot of stage.slots ?? []) {
        if (!slot.uploaded) {
          continue;
        }

        list.push({
          key: `${stage.stage_key}::${slot.code}`,
          title: slot.label,
          group,
          code: slot.code,
          fileName: slot.file_name,
          uploadedBy: slot.uploaded_by,
          uploadedAt: slot.uploaded_at,
          load: (signal) => previewStageDocument(scope, stage.stage_key, slot.code, signal),
        });
      }

      for (const other of stage.others ?? []) {
        list.push({
          key: `${stage.stage_key}::other::${other.id}`,
          title: other.label,
          group,
          fileName: other.file_name,
          uploadedBy: other.uploaded_by,
          uploadedAt: other.uploaded_at,
          load: (signal) => previewOtherStageDocument(scope, stage.stage_key, other.id, signal),
        });
      }
    }

    for (const slot of batch?.slots ?? []) {
      if (!slot.uploaded) {
        continue;
      }

      list.push({
        key: `batch::${slot.code}`,
        title: slot.label,
        group: "Batch documents",
        code: slot.code,
        fileName: slot.file_name,
        uploadedBy: slot.uploaded_by,
        uploadedAt: slot.uploaded_at,
        load: (signal) => previewOtherDocument(scope, slot.code, signal),
      });
    }

    return list;
  }, [batch, checklist.stages, scope]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.title, entry.code, entry.fileName, entry.group]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [entries, search]);

  const activeIndex = filtered.findIndex((entry) => entry.key === preview.target?.key);

  const openEntry = useCallback(
    (entry: PreviewEntry) => {
      setPreviewed((current) => new Set(current).add(entry.key));
      preview.open({ key: entry.key, title: entry.title, load: entry.load });
    },
    [preview],
  );

  const approvalApi = useMemo(
    () => ({
      load: (signal?: AbortSignal) => getStageDocumentsApproval(scope, signal),
      submit: () => submitStageDocumentsApproval(scope),
      decide: (decision: "approved" | "rejected", reason?: string) =>
        decideStageDocumentsApproval(scope, decision, reason),
    }),
    [scope],
  );

  const approval = useApproval(approvalApi);
  const editability = getEditability({ permissions, approval: approval.approval });
  const active = activeIndex >= 0 ? filtered[activeIndex] : null;

  return (
    <MasterDataShell
      title="Master data"
      heading="Document preview"
      eyebrow="Step 4 of 4"
      description="One last look before this set goes for approval. Open each document to check it."
      crumbs={[
        { label: "Master data", to: MASTER_DATA_ROUTES.hub },
        { label: "Types", to: MASTER_DATA_ROUTES.types },
        { label: scopeLabel(scope), to: getStageDocumentsRoute(scope) },
        { label: "Preview" },
      ]}
      steps={MASTER_DATA_STEPS}
      activeStepId="preview"
    >
      <div className="space-y-5">
        {checklist.error ? <MasterDataBanner tone="error" message={checklist.error} /> : null}
        {batchError ? <MasterDataBanner tone="error" message={batchError} /> : null}

        <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-panel border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-h3 font-semibold">
                Documents
                <span className="ml-2 font-mono text-mono-sm font-normal text-subdued">
                  {previewed.size} / {entries.length} previewed
                </span>
              </h2>
              <div className="relative mt-3">
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subdued"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or code"
                  aria-label="Search documents"
                  className="min-h-9 w-full rounded-control border border-border bg-surface py-1.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {checklist.isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-control bg-muted" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-4 py-10 text-center text-small text-subdued">
                  {entries.length === 0
                    ? "No documents have been uploaded for this set yet."
                    : "No documents match your search."}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((entry) => (
                    <li key={entry.key}>
                      <button
                        type="button"
                        onClick={() => openEntry(entry)}
                        aria-current={entry.key === preview.target?.key ? "true" : undefined}
                        className={`flex w-full items-start gap-2 px-4 py-3 text-left transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset ${
                          entry.key === preview.target?.key ? "bg-accent-soft/50" : ""
                        }`}
                      >
                        <FileText className="mt-0.5 size-4 shrink-0 text-subdued" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-small font-medium text-text">
                            {entry.title}
                          </span>
                          <span className="mt-0.5 block truncate text-micro text-subdued">
                            {entry.group}
                            {entry.code ? ` · ${entry.code}` : ""}
                          </span>
                        </span>
                        {previewed.has(entry.key) ? (
                          <Eye className="mt-0.5 size-4 shrink-0 text-success" aria-label="Previewed" />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-panel border border-border bg-surface p-4 shadow-sm">
            {active ? (
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="mr-auto min-w-0">
                  <h3 className="truncate text-h3 font-semibold">{active.title}</h3>
                  <p className="mt-0.5 truncate text-micro text-subdued">
                    {[active.group, active.uploadedBy, formatDate(active.uploadedAt)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="viewer-tool"
                    aria-label="Previous document"
                    disabled={activeIndex <= 0}
                    onClick={() => openEntry(filtered[activeIndex - 1])}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>
                  <span className="px-1 font-mono text-mono-sm text-subdued">
                    {activeIndex + 1} / {filtered.length}
                  </span>
                  <button
                    type="button"
                    className="viewer-tool"
                    aria-label="Next document"
                    disabled={activeIndex < 0 || activeIndex >= filtered.length - 1}
                    onClick={() => openEntry(filtered[activeIndex + 1])}
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            <DocumentViewer
              document={preview.document}
              documentKey={preview.target?.key ?? "none"}
              isLoading={preview.isLoading}
              error={preview.error}
              frameHeight="h-[62vh]"
              emptyMessage="Select a document from the list to preview it."
            />
          </div>
        </section>

        <ApprovalPanel
          title={`Approval - ${scopeLabel(scope)}`}
          description="Submitting routes the full set - stage documents and batch documents - to the Approver."
          controller={approval}
          editability={editability}
        />

        <div className="flex justify-end">
          <button
            type="button"
            className="preview-button-secondary"
            onClick={() => navigate(getBatchDocumentsRoute(scope))}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to batch documents
          </button>
        </div>
      </div>
    </MasterDataShell>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
