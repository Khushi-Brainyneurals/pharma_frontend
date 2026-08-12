import { AlertCircle, CheckCircle2, Info, Lock } from "lucide-react";
import type { ReactNode } from "react";

export type BannerTone = "error" | "success" | "info" | "locked";

interface MasterDataBannerProps {
  tone: BannerTone;
  message: string;
  actions?: ReactNode;
  className?: string;
}

const styles: Record<BannerTone, string> = {
  error: "border-danger/20 bg-danger-soft text-danger-ink",
  success: "border-success/25 bg-approved-bg text-approved-fg",
  info: "border-primary/20 bg-accent-soft text-primary-dark",
  locked: "border-draft-fg/25 bg-draft-bg text-draft-fg",
};

const icons: Record<BannerTone, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  locked: Lock,
};

export function MasterDataBanner({ tone, message, actions, className = "" }: MasterDataBannerProps) {
  const Icon = icons[tone];

  return (
    <div
      className={`flex flex-wrap items-start gap-3 rounded-control border px-4 py-3 text-small ${styles[tone]} ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      {actions ? <span className="flex shrink-0 gap-2">{actions}</span> : null}
    </div>
  );
}
