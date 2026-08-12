import { ArrowRight, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStageDocumentsRoute, MASTER_DATA_ROUTES } from "../../../app/routing/routes";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { MasterDataTypeSummary } from "../api/masterData.types";
import { getMasterDataTypes } from "../api/stageDocuments.api";
import { MasterDataBanner } from "../components/MasterDataBanner";
import { MasterDataShell } from "../components/MasterDataShell";
import { buildTypeCards, MASTER_DATA_STEPS, type MasterDataTypeCard } from "../model/masterData.config";
import { DocumentOptionCard } from "../../new-document/components/DocumentOptionCard";
import { GuardPanel } from "../../new-document/components/GuardPanel";
import { SelectionSummary } from "../../new-document/components/SelectionSummary";
import {
  DOCUMENT_TYPE_OPTIONS,
  DOSAGE_FORM_OPTIONS,
} from "../../new-document/model/documentSelector.config";
import { handleOptionGroupKeyDown } from "../../../shared/ui/optionGroupKeyboardNav";

interface TypeSelectionState {
  dosageFormId: string | null;
  documentTypeId: string | null;
}

const INITIAL_SELECTION: TypeSelectionState = {
  dosageFormId: null,
  documentTypeId: null,
};

export function MasterDataTypesPage() {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<MasterDataTypeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<TypeSelectionState>(INITIAL_SELECTION);

  useEffect(() => {
    const controller = new AbortController();

    getMasterDataTypes(controller.signal)
      .then((types) => setSummaries(types))
      .catch(async (requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const normalized = await normalizeMasterDataError(
          requestError,
          "Unable to load the master data sets.",
        );
        setError(normalized.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const cards = useMemo(() => buildTypeCards(summaries), [summaries]);
  const inProgress = cards.filter((card) => card.hasData);

  const selectedDosageForm = DOSAGE_FORM_OPTIONS.find(
    (option) => option.id === selection.dosageFormId,
  );
  const selectedDocumentType = DOCUMENT_TYPE_OPTIONS.find(
    (option) => option.id === selection.documentTypeId,
  );
  const hasAvailableDocumentTypes = DOCUMENT_TYPE_OPTIONS.some((option) => option.available);
  const isSelectionComplete = Boolean(
    selectedDosageForm?.available && selectedDocumentType?.available,
  );

  function selectDosageForm(optionId: string) {
    setSelection((current) => ({ ...current, dosageFormId: optionId }));
  }

  function selectDocumentType(optionId: string) {
    setSelection((current) => ({ ...current, documentTypeId: optionId }));
  }

  function handleContinue() {
    if (!selectedDosageForm?.available || !selectedDocumentType?.available) {
      return;
    }

    navigate(
      getStageDocumentsRoute({
        productType: selectedDosageForm.backendValue,
        docType: selectedDocumentType.backendValue,
      }),
    );
  }

  return (
    <MasterDataShell
      title="Master data"
      heading="Type Selection"
      description="Each product type and document type keeps its own set of uploaded master formats and its own approval."
      eyebrow="Step 1 of 4"
      crumbs={[{ label: "Master data", to: MASTER_DATA_ROUTES.hub }, { label: "Types" }]}
      steps={MASTER_DATA_STEPS}
      activeStepId="type"
    >
      {error ? <MasterDataBanner tone="error" message={error} className="mb-5" /> : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-panel bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-h3 font-semibold">In progress</h2>
            <p className="mt-1 text-small text-subdued">
              Sets that already have uploaded documents.
            </p>

            {inProgress.length === 0 ? (
              <p className="mt-4 rounded-panel border border-dashed border-border bg-muted px-5 py-8 text-center text-small text-subdued">
                No documents have been uploaded yet. Start a set below.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {inProgress.map((card) => (
                  <TypeCard
                    key={`${card.productType}-${card.docType}`}
                    card={card}
                    onOpen={() => navigate(getStageDocumentsRoute(card))}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-h3 font-semibold">Start a new set</h2>
            <p className="mt-1 text-small text-subdued">
              Choose a product type and document type, the same way you start a new document.
            </p>

            {!hasAvailableDocumentTypes ? (
              <GuardPanel title="No document types configured">
                <p>No document types are configured for this deployment yet. Contact your Admin.</p>
              </GuardPanel>
            ) : (
              <div className="mt-4 space-y-6">
                <div>
                  <h3 className="text-h3 font-semibold">Product type / dosage form</h3>
                  <div
                    className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                    role="radiogroup"
                    aria-label="Product type"
                    onKeyDown={(event) =>
                      handleOptionGroupKeyDown(
                        event,
                        DOSAGE_FORM_OPTIONS,
                        selection.dosageFormId,
                        selectDosageForm,
                      )
                    }
                  >
                    {DOSAGE_FORM_OPTIONS.map((option) => (
                      <DocumentOptionCard
                        key={option.id}
                        option={option}
                        groupName="dosage-form"
                        isSelected={selection.dosageFormId === option.id}
                        isDisabled={false}
                        onSelect={selectDosageForm}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-h3 font-semibold">Document type</h3>
                  <div
                    className="mt-3 grid gap-3 md:grid-cols-2"
                    role="radiogroup"
                    aria-label="Document type"
                    onKeyDown={(event) =>
                      handleOptionGroupKeyDown(
                        event,
                        DOCUMENT_TYPE_OPTIONS,
                        selection.documentTypeId,
                        selectDocumentType,
                      )
                    }
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <DocumentOptionCard
                        key={option.id}
                        option={option}
                        groupName="document-type"
                        isSelected={selection.documentTypeId === option.id}
                        isDisabled={false}
                        onSelect={selectDocumentType}
                      />
                    ))}
                  </div>
                </div>

                <SelectionSummary
                  dosageForm={selectedDosageForm}
                  documentType={selectedDocumentType}
                  isCreating={false}
                />

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center justify-center rounded-control border border-border bg-white px-5 py-2.5 text-small font-semibold text-subdued transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    onClick={() => navigate(MASTER_DATA_ROUTES.hub)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center justify-center rounded-control bg-primary px-5 py-2.5 text-small font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-subdued"
                    disabled={!isSelectionComplete}
                    onClick={handleContinue}
                  >
                    Continue to stage documents 
                    <ArrowRight className="size-4 ml-2" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </MasterDataShell>
  );
}

function TypeCard({ card, onOpen }: { card: MasterDataTypeCard; onOpen: () => void }) {
  const percent =
    card.requiredCount > 0 ? Math.round((card.uploadedCount / card.requiredCount) * 100) : 0;

  if (!card.available) {
    return (
      <div
        className="flex flex-col rounded-panel border border-dashed border-border bg-muted p-5"
        title={card.unavailableReason}
      >
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 size-4 shrink-0 text-subdued" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-small font-semibold text-subdued">{card.label}</h3>
            <p className="mt-1 text-micro text-subdued">{card.unavailableReason}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-panel border border-border bg-surface p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-overlay focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 font-semibold">{card.label}</h3>
          <p className="mt-1 text-micro uppercase tracking-overline text-subdued">
            {card.productType} · {card.docType}
          </p>
        </div>
        {card.hasData ? (
          <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 font-mono text-mono-sm text-primary-dark">
            {card.uploadedCount}
            {card.requiredCount ? ` / ${card.requiredCount}` : ""}
          </span>
        ) : null}
      </div>

      {card.hasData && card.requiredCount > 0 ? (
        <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </span>
      ) : null}

      <span className="mt-4 inline-flex items-center gap-1 border-t border-border pt-3 text-small font-semibold text-primary-dark">
        {card.hasData ? "Continue" : "Start"}
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </button>
  );
}
