import { useCallback, useEffect, useState } from "react";
import { getStages } from "../api/stages.api";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { StageOption } from "../api/masterData.types";

export interface UseStagesParams {
  productType: string;
  docType: string;
}

export interface StagesController {
  options: StageOption[];
  isLoading: boolean;
  error: string | null;
  supported: boolean;
  reload: () => Promise<void>;
}

/**
 * Fetches the stage catalog for one (productType, docType) once and shares it -
 * both the Equipment `stage` dropdown and the Instrument `location` dropdown
 * render from this same list instead of each firing their own request.
 */
export function useStages({ productType, docType }: UseStagesParams): StagesController {
  const [options, setOptions] = useState<StageOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getStages({ productType, docType }, signal);

        if (signal?.aborted) {
          return;
        }

        setOptions(response.stages ?? []);
        setSupported(response.supported ?? true);
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        const normalized = await normalizeMasterDataError(err, "Unable to load stage options.");
        setError(normalized.message);
        setOptions([]);
        setSupported(false);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [productType, docType],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { options, isLoading, error, supported, reload: () => load() };
}
