import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../../../shared/api/apiError";
import { getMyDashboard } from "../api/dashboard.api";
import type { DashboardCard, DashboardDocument } from "../api/dashboard.types";

export interface UseDashboardResult {
  role: string | null;
  cards: DashboardCard[];
  documents: DashboardDocument[];
  selectedBucket: string | null;
  /** True only for the very first load - cards aren't on screen yet. */
  isLoading: boolean;
  /** True while re-fetching for a bucket change; cards/documents stay visible underneath. */
  isRefreshing: boolean;
  error: string | null;
  selectBucket: (key: string) => void;
  clearBucket: () => void;
  reload: () => void;
}

/** Load -> card click -> re-filter for the role-aware `/api/bmr/dashboard/me` endpoint. */
export function useDashboard(): UseDashboardResult {
  const [dashboard, setDashboard] = useState<{
    role: string;
    cards: DashboardCard[];
    documents: DashboardDocument[];
  } | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const requestSeqRef = useRef(0);

  const load = useCallback(async (bucket: string | null, signal?: AbortSignal) => {
    const seq = (requestSeqRef.current += 1);

    if (hasLoadedRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await getMyDashboard(bucket ?? undefined, signal);

      if (signal?.aborted || seq !== requestSeqRef.current) {
        return;
      }

      setDashboard(response);
      setSelectedBucket(bucket);
      hasLoadedRef.current = true;
    } catch (requestError) {
      if (signal?.aborted || seq !== requestSeqRef.current) {
        return;
      }

      setError(getApiErrorMessage(requestError, "Unable to load the dashboard. Please try again."));
    } finally {
      if (!signal?.aborted && seq === requestSeqRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(null, controller.signal);
    return () => controller.abort();
  }, [load]);

  return {
    role: dashboard?.role ?? null,
    cards: dashboard?.cards ?? [],
    documents: dashboard?.documents ?? [],
    selectedBucket,
    isLoading,
    isRefreshing,
    error,
    selectBucket: useCallback((key: string) => void load(key), [load]),
    clearBucket: useCallback(() => void load(null), [load]),
    reload: useCallback(() => void load(selectedBucket), [load, selectedBucket]),
  };
}
