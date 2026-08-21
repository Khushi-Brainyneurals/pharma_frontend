import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  FileEdit,
  FileText,
  RotateCcw,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { DashboardCard, DashboardDocument } from "../api/dashboard.types";

/**
 * Status/bucket -> badge tone, by keyword rather than an exact allow-list.
 * Card labels and document statuses are backend-driven and vary by role
 * (Preparer/Reviewer/Approver), so this only needs to *not break* on a
 * status it has never seen - unmatched values fall back to a neutral tone.
 */
const TONE_BY_KEYWORD: Array<{ test: RegExp; classes: string }> = [
  { test: /reject/i, classes: "bg-rejected-bg text-rejected-fg" },
  { test: /return|correction/i, classes: "bg-draft-bg text-draft-fg" },
  { test: /approv|ready|print/i, classes: "bg-approved-bg text-approved-fg" },
  { test: /review/i, classes: "bg-inreview-bg text-inreview-fg" },
  { test: /draft/i, classes: "bg-draft-bg text-draft-fg" },
];

export function statusBadgeClasses(document: DashboardDocument): string {
  const source = `${document.status ?? ""} ${document.bucket ?? ""}`;
  const match = TONE_BY_KEYWORD.find(({ test }) => test.test(source));
  return match?.classes ?? "bg-superseded-bg text-superseded-fg";
}

export interface CardVisual {
  Icon: LucideIcon;
  chipClasses: string;
}

/** Icon + chip tone for a summary card, matched on its `key`/`label` by keyword - same fallback contract as `statusBadgeClasses`. */
const CARD_VISUAL_BY_KEYWORD: Array<{ test: RegExp; Icon: LucideIcon; chipClasses: string }> = [
  { test: /overdue/i, Icon: AlertTriangle, chipClasses: "bg-danger-soft text-danger" },
  { test: /reject/i, Icon: XCircle, chipClasses: "bg-rejected-bg text-rejected-fg" },
  { test: /return|correction/i, Icon: RotateCcw, chipClasses: "bg-draft-bg text-draft-fg" },
  { test: /approval/i, Icon: Clock, chipClasses: "bg-inreview-bg text-inreview-fg" },
  { test: /approv|ready|print/i, Icon: CheckCircle2, chipClasses: "bg-approved-bg text-approved-fg" },
  { test: /review/i, Icon: ClipboardCheck, chipClasses: "bg-inreview-bg text-inreview-fg" },
  { test: /draft/i, Icon: FileEdit, chipClasses: "bg-draft-bg text-draft-fg" },
];

export function getCardVisual(card: DashboardCard): CardVisual {
  const source = `${card.key ?? ""} ${card.label ?? ""}`;
  const match = CARD_VISUAL_BY_KEYWORD.find(({ test }) => test.test(source));
  return match
    ? { Icon: match.Icon, chipClasses: match.chipClasses }
    : { Icon: FileText, chipClasses: "bg-superseded-bg text-superseded-fg" };
}

export function statusLabel(document: DashboardDocument): string {
  return humanize(document.status) || humanize(document.bucket) || "Unknown";
}

export function humanize(value: string | undefined | null): string {
  if (!value) {
    return "";
  }

  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDashboardDate(value: string | undefined | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
