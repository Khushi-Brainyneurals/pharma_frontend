import { AlertCircle, ArrowLeft, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../../app/layout/AppShell";
import { getCoverBomRoute, ROUTES } from "../../../app/routing/routes";
import { getApiErrorMessage } from "../../../shared/api/apiError";
import { USER_ROLES } from "../../auth/model/roles";
import { useAuthStore } from "../../auth/state/auth.store";
import { PreviewStateCard } from "../../format-preview/components/PreviewStateCard";
// Reuses the same stage catalog already introduced for Equipment/Instrument -
// one API/hook backing all three features instead of three implementations.
import { useStages } from "../../master-data/hooks/useStages";
import { DocumentStepper } from "../../new-document/components/DocumentStepper";
import { useDocumentSelectorData } from "../../new-document/hooks/useDocumentSelectorData";
import { DOCUMENT_SELECTOR_STEPS } from "../../new-document/model/documentSelector.config";
import { getStageParams, setStageParams, setStages } from "../api/stages.api";
import { StageAccordion } from "../components/StageAccordion";
import { ParameterPanel } from "../components/ParameterPanel";
import {
  buildStageStateFromApi,
  hasSavedData,
  useStageState,
} from "../hooks/useStageState";
import type { ParameterKind, ParameterMode, StageState } from "../types/stages.types";

// Only configuration supported for now - the stages API is scoped per (product_type, doc_type).
// Kept as one named pair here (not scattered) so a real BMR-context value can replace it later.
const STAGE_PRODUCT_TYPE = "tablet";
const STAGE_DOC_TYPE = "bmr";

// ─── Notification banner ──────────────────────────────────────────────────────

function AlertBanner({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string;
}) {
  const Icon = tone === "error" ? AlertCircle : AlertCircle;
  return (
    <div
      role="status"
      className={`mb-5 flex items-start gap-3 rounded-control border px-4 py-3 text-small ${
        tone === "error"
          ? "border-danger/20 bg-danger-soft text-danger-ink"
          : "border-approved-fg/25 bg-approved-bg text-approved-fg"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      {message}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * SelectStagesPage — Step 5 of the BMR document creation wizard.
 *
 * Renders whatever manufacturing stages the backend returns as an accordion
 * list - the stage catalog is fully dynamic, never a fixed count.
 * Only parameters are in scope for this release.
 */
export function SelectStagesPage() {
  const { documentId = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { context, isLoading: isLoadingContext } = useDocumentSelectorData(user);

  const canAuthor = user?.role === USER_ROLES.PREPARED_BY;

  // ── Stage catalog (backend-driven) ─────────────────────────────────────────
  const stages = useStages({ productType: STAGE_PRODUCT_TYPE, docType: STAGE_DOC_TYPE });
  const stageLabelByKey = useMemo(
    () => new Map(stages.options.map((stage) => [stage.key, stage.label])),
    [stages.options],
  );

  // ── Selection state - which stages are included in this BMR, by key ───────
  const [selectedStageKeys, setSelectedStageKeys] = useState<Set<string>>(new Set());

  // ── Accordion UI state ─────────────────────────────────────────────────────
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);

  // ── Loading / saving state ─────────────────────────────────────────────────
  const [loadingStageId, setLoadingStageId] = useState<string | null>(null);
  const [savingStageId, setSavingStageId] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);

  // ── Notifications ──────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Parameter state per stage ──────────────────────────────────────────────
  const {
    stageStateMap,
    savedStageIds,
    setStageState,
    updateParameter,
    markSaved,
    markUnsaved,
    getOrCreateStageState,
    resetStageState,
  } = useStageState();

  // Snapshot of state at last save (for Cancel)
  const lastSavedStateRef = useRef<Record<string, StageState>>({});
  const continueRef = useRef(false);

  // ── Hydrate saved params for every stage on load/refresh ──────────────────
  // Fixes stages with already-saved parameters showing up unchecked until the
  // user manually expands them - fetch every stage's params up front instead.
  const [isHydratingSelection, setIsHydratingSelection] = useState(false);
  const hydratedForDocRef = useRef<string | null>(null);

  useEffect(() => {
    if (!canAuthor || stages.isLoading || stages.error || stages.options.length === 0) {
      return;
    }

    if (hydratedForDocRef.current === documentId) {
      return;
    }
    hydratedForDocRef.current = documentId;

    let isCurrent = true;
    setIsHydratingSelection(true);

    void (async () => {
      const results = await Promise.allSettled(
        stages.options.map(async (stage) => ({
          key: stage.key,
          apiData: await getStageParams(documentId, stage.key),
        })),
      );

      if (!isCurrent) {
        return;
      }

      const savedKeys: string[] = [];
      let hadFailure = false;

      for (const result of results) {
        if (result.status === "rejected") {
          hadFailure = true;
          continue;
        }

        const { key, apiData } = result.value;
        const state = buildStageStateFromApi(key, apiData);
        setStageState(key, state);
        lastSavedStateRef.current[key] = state;

        if (hasSavedData(apiData)) {
          markSaved(key);
          savedKeys.push(key);
        }
      }

      if (savedKeys.length > 0) {
        setSelectedStageKeys((prev) => new Set([...prev, ...savedKeys]));
      }

      if (hadFailure) {
        setError("Some stages' saved parameters could not be loaded. Expand a stage to retry.");
      }

      setIsHydratingSelection(false);
    })();

    return () => {
      isCurrent = false;
    };
  }, [canAuthor, documentId, markSaved, setStageState, stages.error, stages.isLoading, stages.options]);

  // ── Select / unselect a stage ──────────────────────────────────────────────
  const handleToggleSelect = useCallback(
    (stageId: string) => {
      if (isContinuing) return;
      const willBeSelected = !selectedStageKeys.has(stageId);

      setSelectedStageKeys((prev) => {
        const next = new Set(prev);
        if (willBeSelected) {
          next.add(stageId);
        } else {
          next.delete(stageId);
        }
        return next;
      });

      // Deselecting a stage that's currently expanded closes its panel too.
      if (!willBeSelected && expandedStageId === stageId) {
        setExpandedStageId(null);
      }
    },
    [expandedStageId, isContinuing, selectedStageKeys],
  );

  // ── Toggle accordion ───────────────────────────────────────────────────────
  const handleToggleStage = useCallback(
    async (stageId: string) => {
      if (loadingStageId || savingStageId || isContinuing) return;
      // A stage can only expand once it has been selected.
      if (!selectedStageKeys.has(stageId)) return;
      setError(null);
      setNotice(null);

      if (expandedStageId === stageId) {
        // Collapse
        setExpandedStageId(null);
        return;
      }

      // Expand — load params if not yet loaded
      setExpandedStageId(stageId);

      if (stageStateMap[stageId]) {
        // Already loaded — just expand
        return;
      }

      setLoadingStageId(stageId);
      try {
        const apiData = await getStageParams(documentId, stageId);
        const state = buildStageStateFromApi(stageId, apiData);
        setStageState(stageId, state);
        lastSavedStateRef.current[stageId] = state;
        if (hasSavedData(apiData)) markSaved(stageId);
      } catch (err) {
        const stageName = stageLabelByKey.get(stageId) ?? stageId;
        setError(
          getApiErrorMessage(
            err,
            `Unable to load parameters for ${stageName}. Please try again.`,
          ),
        );
        setExpandedStageId(null);
      } finally {
        setLoadingStageId(null);
      }
    },
    [
      documentId,
      expandedStageId,
      isContinuing,
      loadingStageId,
      markSaved,
      savingStageId,
      selectedStageKeys,
      setStageState,
      stageLabelByKey,
      stageStateMap,
    ],
  );

  // ── Save parameters for a stage ────────────────────────────────────────────
  const handleSaveParameters = useCallback(
    async (stageId: string) => {
      if (savingStageId || isContinuing) return;
      const state = getOrCreateStageState(stageId);
      const stageName = stageLabelByKey.get(stageId) ?? stageId;

      setSavingStageId(stageId);
      setError(null);
      try {
        await setStageParams(documentId, stageId, { parameters: state.parameters });
        lastSavedStateRef.current[stageId] = state;
        markSaved(stageId);
        setExpandedStageId(null);
        setNotice(`${stageName} parameters saved.`);
      } catch (err) {
        setError(
          getApiErrorMessage(err, `Unable to save ${stageName} parameters.`),
        );
      } finally {
        setSavingStageId(null);
      }
    },
    [documentId, getOrCreateStageState, isContinuing, markSaved, savingStageId, stageLabelByKey],
  );

  // ── Cancel — revert to last saved snapshot ─────────────────────────────────
  const handleCancel = useCallback(
    (stageId: string) => {
      const snapshot = lastSavedStateRef.current[stageId];
      if (snapshot) {
        resetStageState(stageId, snapshot);
        markUnsaved(stageId);
        // Re-check if it was originally saved (it was, since we have a snapshot)
        if (hasSavedData({ parameters: snapshot.parameters })) {
          markSaved(stageId);
        }
      }
      setExpandedStageId(null);
    },
    [markSaved, markUnsaved, resetStageState],
  );

  // ── Save & continue ────────────────────────────────────────────────────────
  const canContinue =
    selectedStageKeys.size > 0 &&
    expandedStageId === null &&
    !isContinuing &&
    !savingStageId;

  const pendingCount = [...selectedStageKeys].filter(
    (key) => !savedStageIds.has(key),
  ).length;

  const handleContinue = useCallback(async () => {
    if (!canContinue || continueRef.current) return;
    continueRef.current = true;
    setIsContinuing(true);
    setError(null);
    try {
      await setStages(documentId, [...selectedStageKeys]);
      setNotice(
        "Selected stages saved. The next workflow step is not available in this release.",
      );
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Unable to save selected stages. Please try again."),
      );
    } finally {
      continueRef.current = false;
      setIsContinuing(false);
    }
  }, [canContinue, documentId, selectedStageKeys]);

  // ── Parameter handlers ─────────────────────────────────────────────────────
  const makeParamHandlers = (stageId: string) => ({
    onToggleEnabled: (paramIndex: number) => {
      const state = getOrCreateStageState(stageId);
      const current = state.parameters[paramIndex];
      if (!current) return;
      updateParameter(stageId, paramIndex, "enabled", !current.enabled);
    },
    onModeChange: (paramIndex: number, mode: ParameterMode) => {
      updateParameter(stageId, paramIndex, "mode", mode);
    },
    onKindChange: (paramIndex: number, kind: ParameterKind) => {
      updateParameter(stageId, paramIndex, "kind", kind);
    },
    onMinChange: (paramIndex: number, value: string) => {
      updateParameter(stageId, paramIndex, "min", value);
    },
    onMaxChange: (paramIndex: number, value: string) => {
      updateParameter(stageId, paramIndex, "max", value);
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────

  const totalCount = stages.options.length;
  const globalDisabled = isContinuing;

  return (
    <AppShell user={user} unit={context?.unit ?? null} isLoadingUnit={isLoadingContext}>
      {/* ── Step bar ── */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          <DocumentStepper steps={DOCUMENT_SELECTOR_STEPS} activeStepId="stages" />
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Page header ── */}
        <header className="mb-6">
          <p className="text-micro font-semibold uppercase tracking-overline text-primary-dark">
            Step 5 of 6
          </p>
          <h1 className="mt-1 text-h1 font-semibold">Select stages</h1>
          <p className="mt-2 max-w-3xl text-small leading-6 text-subdued">
            Configure in-process parameters for each manufacturing stage included
            in this BMR.
          </p>
        </header>

        {/* ── Permission guard ── */}
        {!canAuthor ? (
          <PreviewStateCard
            icon={AlertCircle}
            title="Permission denied"
            message="Selecting manufacturing stages is available only to the Prepared By role."
            tone="permission"
            actions={
              <button
                type="button"
                className="preview-button-secondary"
                onClick={() => navigate(ROUTES.statusBoard)}
              >
                Back to dashboard
              </button>
            }
          />
        ) : (
          <>
            {/* ── Notifications ── */}
            {error ? <AlertBanner tone="error" message={error} /> : null}
            {notice ? <AlertBanner tone="success" message={notice} /> : null}

            {/* ── Stage accordion list ── */}
            <section
              className="overflow-hidden rounded-panel border border-border bg-surface shadow-sm"
              aria-label="Manufacturing stages"
            >
              {/* Panel header */}
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
                <h2 className="mr-auto text-h3 font-semibold">
                  Manufacturing stages
                </h2>
                {!stages.isLoading && !isHydratingSelection && !stages.error && totalCount > 0 ? (
                  <span className="rounded-pill bg-muted px-3 py-1 font-mono text-mono-sm text-subdued">
                    {selectedStageKeys.size} of {totalCount} selected
                  </span>
                ) : null}
              </div>

              {/* ── Stage catalog loading / error / empty states ── */}
              {stages.isLoading || isHydratingSelection ? (
                <div className="flex min-h-48 items-center justify-center gap-3 p-6 text-small text-subdued">
                  <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
                  Loading stages…
                </div>
              ) : stages.error ? (
                <div className="p-5">
                  <AlertBanner tone="error" message={`Unable to load stages - ${stages.error}`} />
                  <button
                    type="button"
                    className="preview-button-secondary min-h-8 px-3"
                    onClick={() => void stages.reload()}
                  >
                    Retry
                  </button>
                </div>
              ) : !stages.supported || stages.options.length === 0 ? (
                <div className="p-6 text-center text-small text-subdued">
                  No manufacturing stages are configured for this product type and document type yet.
                </div>
              ) : (
                /* Stage rows */
                <div className="divide-y divide-border">
                  {stages.options.map((stage, index) => {
                  const isSelected = selectedStageKeys.has(stage.key);
                  const isExpanded = expandedStageId === stage.key;
                  const isLoading = loadingStageId === stage.key;
                  const isSaving = savingStageId === stage.key;
                  const isSaved = savedStageIds.has(stage.key);
                  const handlers = makeParamHandlers(stage.key);
                  const stageState = stageStateMap[stage.key] ?? null;

                  return (
                    <StageAccordion
                      key={stage.key}
                      ordinal={index + 1}
                      stageId={stage.key}
                      stageName={stage.label}
                      isSelected={isSelected}
                      isExpanded={isExpanded}
                      isLoading={isLoading}
                      isSaving={isSaving}
                      isSaved={isSaved}
                      globalDisabled={globalDisabled}
                      onToggleSelect={() => handleToggleSelect(stage.key)}
                      onToggleExpand={() => void handleToggleStage(stage.key)}
                    >
                      {isExpanded && stageState ? (
                        <ParameterPanel
                          stageId={stage.key}
                          stageName={stage.label}
                          parameters={stageState.parameters}
                          isSaving={isSaving}
                          onToggleEnabled={handlers.onToggleEnabled}
                          onModeChange={handlers.onModeChange}
                          onKindChange={handlers.onKindChange}
                          onMinChange={handlers.onMinChange}
                          onMaxChange={handlers.onMaxChange}
                          onCancel={() => handleCancel(stage.key)}
                          onSave={() => void handleSaveParameters(stage.key)}
                        />
                      ) : null}
                    </StageAccordion>
                  );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── Sticky footer ── */}
      {canAuthor ? (
        <div className="sticky bottom-0 z-10 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_-18px_rgba(21,33,46,.45)] backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3">
            <span className="mr-auto text-small text-subdued">
              {selectedStageKeys.size === 0
                ? "Select at least one stage to continue."
                : pendingCount > 0
                  ? `${pendingCount} selected stage${pendingCount === 1 ? "" : "s"} still ${pendingCount === 1 ? "has" : "have"} parameters pending.`
                  : "All selected stages have parameters saved."}
            </span>
            <button
              type="button"
              className="preview-button-secondary"
              disabled={globalDisabled}
              onClick={() => navigate(getCoverBomRoute(documentId))}
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
            <button
              type="button"
              className="preview-button-primary"
              disabled={!canContinue}
              onClick={() => void handleContinue()}
            >
              {isContinuing ? (
                <Save className="size-4 animate-pulse" />
              ) : (
                <Save className="size-4" />
              )}
              Save &amp; continue
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
