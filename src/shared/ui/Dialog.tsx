import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";

interface DialogProps {
  title: string;
  busy?: boolean;
  size?: "md" | "lg" | "xl";
  onClose: () => void;
  children: ReactNode;
}

const sizes = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
} as const;

export function Dialog({ title, busy = false, size = "lg", onClose, children }: DialogProps) {
  const titleId = useId();

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    document.addEventListener("keydown", keyDown);
    return () => document.removeEventListener("keydown", keyDown);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--scrim)] p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[90vh] w-full ${sizes[size]} overflow-y-auto rounded-modal border border-border bg-surface p-5 shadow-modal sm:p-6`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-h2 font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            disabled={busy}
            className="viewer-tool border-0"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
