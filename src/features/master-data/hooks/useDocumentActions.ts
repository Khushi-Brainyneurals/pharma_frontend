import { useCallback, useRef, useState } from "react";
import { normalizeMasterDataError, type MasterDataError } from "../api/masterData.errors";

export type DocumentActionStatus = "idle" | "busy" | "error";

/** Returned synchronously so callers never read stale React state after an action. */
export type DocumentActionResult = { ok: true } | { ok: false; error: MasterDataError | null };

export interface DocumentActionState {
  status: DocumentActionStatus;
  progress: number;
  error: string | null;
}

const IDLE: DocumentActionState = { status: "idle", progress: 0, error: null };

export interface DocumentActionsController {
  stateFor: (key: string) => DocumentActionState;
  /** Runs an action for one slot, tracking progress and keeping it retryable. */
  run: (
    key: string,
    action: (onProgress: (percent: number) => void) => Promise<unknown>,
    fallbackMessage: string,
  ) => Promise<DocumentActionResult>;
  retry: (key: string) => Promise<DocumentActionResult>;
  canRetry: (key: string) => boolean;
  fail: (key: string, message: string) => void;
  clear: (key: string) => void;
  isAnyBusy: boolean;
}

/**
 * Per-document upload/remove state. Keyed by slot so several documents can be
 * in flight without one failure clearing another's error.
 */
export function useDocumentActions(): DocumentActionsController {
  const [states, setStates] = useState<Record<string, DocumentActionState>>({});
  const lastAction = useRef<
    Record<string, { action: (onProgress: (percent: number) => void) => Promise<unknown>; fallbackMessage: string }>
  >({});
  const inFlight = useRef<Set<string>>(new Set());

  const patch = useCallback((key: string, next: DocumentActionState) => {
    setStates((current) => ({ ...current, [key]: next }));
  }, []);

  const run = useCallback<DocumentActionsController["run"]>(
    async (key, action, fallbackMessage) => {
      if (inFlight.current.has(key)) {
        return { ok: false, error: null };
      }

      inFlight.current.add(key);
      lastAction.current[key] = { action, fallbackMessage };
      patch(key, { status: "busy", progress: 0, error: null });

      try {
        await action((progress) => patch(key, { status: "busy", progress, error: null }));
        patch(key, IDLE);
        delete lastAction.current[key];
        return { ok: true };
      } catch (error) {
        const normalized = await normalizeMasterDataError(error, fallbackMessage);
        patch(key, { status: "error", progress: 0, error: normalized.message });
        return { ok: false, error: normalized };
      } finally {
        inFlight.current.delete(key);
      }
    },
    [patch],
  );

  const retry = useCallback<DocumentActionsController["retry"]>(
    async (key) => {
      const previous = lastAction.current[key];
      return previous
        ? run(key, previous.action, previous.fallbackMessage)
        : { ok: false as const, error: null };
    },
    [run],
  );

  return {
    stateFor: useCallback((key: string) => states[key] ?? IDLE, [states]),
    run,
    retry,
    canRetry: useCallback((key: string) => Boolean(lastAction.current[key]), []),
    fail: useCallback(
      (key: string, message: string) => patch(key, { status: "error", progress: 0, error: message }),
      [patch],
    ),
    clear: useCallback(
      (key: string) => {
        delete lastAction.current[key];
        patch(key, IDLE);
      },
      [patch],
    ),
    isAnyBusy: Object.values(states).some((state) => state.status === "busy"),
  };
}
