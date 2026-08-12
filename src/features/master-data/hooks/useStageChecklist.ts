import { useCallback, useEffect, useState } from "react";
import { getChecklist, getStageChecklist } from "../api/stageDocuments.api";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { MasterDataChecklist, MasterDataScope, StageChecklist } from "../api/masterData.types";

export interface StageChecklistController {
  checklist: MasterDataChecklist | null;
  stages: StageChecklist[];
  uploadedCount: number;
  requiredCount: number;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Re-reads one stage after a mutation instead of the whole set. */
  refreshStage: (stageKey: string) => Promise<void>;
}

export function useStageChecklist(scope: MasterDataScope): StageChecklistController {
  const [checklist, setChecklist] = useState<MasterDataChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { productType, docType } = scope;

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const next = await getChecklist({ productType, docType }, signal);
        if (!signal?.aborted) {
          setChecklist(next);
          setError(null);
        }
      } catch (requestError) {
        if (signal?.aborted) {
          return;
        }
        const normalized = await normalizeMasterDataError(
          requestError,
          "Unable to load the stage document checklist.",
        );
        setError(normalized.message);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [docType, productType],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refreshStage = useCallback(
    async (stageKey: string) => {
      try {
        const stage = await getStageChecklist({ productType, docType }, stageKey);

        setChecklist((current) => {
          if (!current) {
            return current;
          }

          const stages = (current.stages ?? []).map((existing) =>
            existing.stage_key === stageKey ? stage : existing,
          );

          return {
            ...current,
            stages,
            uploaded_count: stages.reduce((total, item) => total + (item.uploaded_count ?? 0), 0),
            required_count: stages.reduce((total, item) => total + (item.required_count ?? 0), 0),
          };
        });
      } catch (requestError) {
        const normalized = await normalizeMasterDataError(
          requestError,
          "Unable to refresh this stage.",
        );
        setError(normalized.message);
      }
    },
    [docType, productType],
  );

  const stages = checklist?.stages ?? [];

  return {
    checklist,
    stages,
    uploadedCount: checklist?.uploaded_count ?? 0,
    requiredCount: checklist?.required_count ?? 0,
    isLoading,
    error,
    reload: useCallback(() => load(), [load]),
    refreshStage,
  };
}
