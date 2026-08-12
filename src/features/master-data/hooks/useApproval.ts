import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { ApprovalDecision, ApprovalState } from "../api/masterData.types";

export interface ApprovalApi {
  load: (signal?: AbortSignal) => Promise<ApprovalState>;
  submit: () => Promise<ApprovalState>;
  decide: (decision: ApprovalDecision, reason?: string) => Promise<ApprovalState>;
}

export interface ApprovalController {
  approval: ApprovalState | null;
  isLoading: boolean;
  isBusy: boolean;
  error: string | null;
  notice: string | null;
  reload: () => Promise<void>;
  submit: () => Promise<boolean>;
  decide: (decision: ApprovalDecision, reason?: string) => Promise<boolean>;
  dismissNotice: () => void;
}

/**
 * Shared by all three approval categories - they differ only in which endpoints
 * they call, so the state machine lives here once.
 */
export function useApproval(api: ApprovalApi, onChanged?: () => void): ApprovalController {
  const [approval, setApproval] = useState<ApprovalState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const apiRef = useRef(api);
  const changedRef = useRef(onChanged);
  const inFlight = useRef(false);

  apiRef.current = api;
  changedRef.current = onChanged;

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const state = await apiRef.current.load(signal);
      if (!signal?.aborted) {
        setApproval(state);
        setError(null);
      }
    } catch (requestError) {
      if (signal?.aborted) {
        return;
      }
      const normalized = await normalizeMasterDataError(requestError, "Unable to load the approval status.");
      setError(normalized.message);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const run = useCallback(
    async (action: () => Promise<ApprovalState>, successMessage: string) => {
      if (inFlight.current) {
        return false;
      }

      inFlight.current = true;
      setIsBusy(true);
      setError(null);

      try {
        setApproval(await action());
        setNotice(successMessage);
        changedRef.current?.();
        return true;
      } catch (requestError) {
        const normalized = await normalizeMasterDataError(requestError, "The request could not be completed.");
        setError(normalized.message);
        return false;
      } finally {
        inFlight.current = false;
        setIsBusy(false);
      }
    },
    [],
  );

  const submit = useCallback(
    () => run(() => apiRef.current.submit(), "Submitted for Approver review."),
    [run],
  );

  const decide = useCallback(
    (decision: ApprovalDecision, reason?: string) =>
      run(
        () => apiRef.current.decide(decision, reason),
        decision === "approved" ? "Approved." : "Rejected - the reason has been recorded.",
      ),
    [run],
  );

  return {
    approval,
    isLoading,
    isBusy,
    error,
    notice,
    reload: useCallback(() => load(), [load]),
    submit,
    decide,
    dismissNotice: useCallback(() => setNotice(null), []),
  };
}
