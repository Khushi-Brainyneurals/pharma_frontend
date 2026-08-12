import { Clock3 } from "lucide-react";

interface SessionTimeoutOverlayProps {
  onSignIn: () => void;
}

/**
 * Full-screen modal shown whenever the global auth store marks the session
 * as expired (see `shared/api/httpClient.ts`'s response interceptor). This is
 * the same overlay originally built for `format-preview`, relocated here so
 * every page renders the identical UI instead of each feature having its own.
 */
export function SessionTimeoutOverlay({ onSignIn }: SessionTimeoutOverlayProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--scrim)] p-4">
      <section className="w-full max-w-[500px] rounded-modal border border-border bg-surface p-7 text-center shadow-modal" role="alertdialog" aria-modal="true" aria-labelledby="timeout-title">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-accent-soft text-primary-dark"><Clock3 className="size-7" aria-hidden="true" /></span>
        <h2 id="timeout-title" className="mt-5 text-h1 font-semibold text-text">Your session has timed out</h2>
        <p className="mt-2 text-small text-subdued">Your session has ended for security reasons. Sign in again to continue.</p>
        <button type="button" className="preview-button-primary mt-6" onClick={onSignIn}>Sign in again</button>
      </section>
    </div>
  );
}
