import { Bell, ChevronDown, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthenticatedUser } from "../../auth/api/auth.types";
import { USER_ROLE_LABELS } from "../../auth/model/roles";
import type { UnitContext } from "../model/documentSelector.types";

interface AppHeaderProps {
  user: AuthenticatedUser | null;
  unit: UnitContext | null;
  isLoadingUnit?: boolean;
}

export function AppHeader({ user, unit, isLoadingUnit = false }: AppHeaderProps) {
  const [time, setTime] = useState(() => formatTime(new Date()));
  const displayName = user?.displayName ?? user?.username ?? "User";
  const initials = getInitials(displayName);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTime(formatTime(new Date()));
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex min-h-topbar items-center border-b border-border bg-surface p-3 text-small text-text lg:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <img className="size-8 shrink-0" src="/pharma-logo.png" alt="" />
        <div className="min-w-0">
          <p className="text-small font-semibold leading-5">PharmaDoc AI</p>
          <h1 className="truncate text-h2 font-semibold">
            New document — batch manufacturing record
          </h1>
        </div>
      </div>

      <div className="ml-4 hidden items-center gap-3 md:flex">
        {isLoadingUnit ? (
          <span className="h-7 w-20 animate-pulse rounded-pill bg-muted" aria-hidden="true" />
        ) : (
          <span className="rounded-pill border border-primary/20 bg-accent-soft px-3 py-1 text-small font-semibold text-primary-dark">
            {unit?.id ?? "No Unit"}
          </span>
        )}
        <span className="text-small font-medium text-subdued">
          {user ? USER_ROLE_LABELS[user.role] : "Prepared By"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-muted px-3 py-1 text-small text-subdued">
          <Clock3 className="size-4" aria-hidden="true" />
          {time}
        </span>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-control border border-border text-subdued transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Notifications"
        >
          <Bell className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-control border border-border px-2 py-1.5 text-left transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="User menu"
        >
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-micro font-semibold text-white">
            {initials}
          </span>
          <span className="max-w-32 truncate text-small font-semibold">{displayName}</span>
          <ChevronDown className="size-4 text-subdued" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
