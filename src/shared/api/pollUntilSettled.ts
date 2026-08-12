export interface PollUntilSettledOptions<T> {
  fetchStatus: (signal: AbortSignal) => Promise<T>;
  isSettled: (value: T) => boolean;
  onUpdate?: (value: T) => void;
  intervalMs?: number;
  signal: AbortSignal;
}

/**
 * Generic status-polling loop: fetches, reports each value via onUpdate, and
 * keeps going at `intervalMs` until `isSettled` is true or `signal` aborts.
 */
export async function pollUntilSettled<T>({
  fetchStatus,
  isSettled,
  onUpdate,
  intervalMs = 1500,
  signal,
}: PollUntilSettledOptions<T>): Promise<T> {
  while (true) {
    const value = await fetchStatus(signal);
    onUpdate?.(value);
    if (isSettled(value)) return value;
    await delay(intervalMs, signal);
  }
}

function delay(ms: number, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
