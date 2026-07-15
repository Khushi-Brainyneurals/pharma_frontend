import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PreviewStateCardProps {
  icon: LucideIcon;
  title: string;
  message: string;
  tone?: "neutral" | "warning" | "danger" | "permission";
  detail?: ReactNode;
  actions: ReactNode;
}

export function PreviewStateCard({
  icon: Icon,
  title,
  message,
  tone = "neutral",
  detail,
  actions,
}: PreviewStateCardProps) {
  const colors = tone === "danger"
    ? "bg-danger-soft text-danger"
    : tone === "warning"
      ? "bg-draft-bg text-draft-fg"
      : tone === "permission"
        ? "bg-muted text-text"
        : "bg-accent-soft text-primary-dark";

  return (
    <section className="mx-auto flex min-h-[440px] max-w-[760px] items-center justify-center px-4 py-10">
      <div className="w-full rounded-panel border border-border bg-surface p-7 text-center shadow-sm sm:p-10" role="alert">
        <span className={`mx-auto inline-flex size-14 items-center justify-center rounded-full ${colors}`}>
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-h1 font-semibold text-text">{title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-body text-subdued">{message}</p>
        {detail ? <div className="mx-auto mt-5 max-w-xl rounded-control border border-border bg-muted px-4 py-3 text-left text-small text-subdued">{detail}</div> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
      </div>
    </section>
  );
}
