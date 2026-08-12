import { Bell, Clock3, Loader2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthenticatedUser } from "../../auth/api/auth.types";
import { useLogout } from "../../auth/hooks/useLogout";
import { USER_ROLE_LABELS } from "../../auth/model/roles";
import type { UnitContext } from "../model/documentSelector.types";

interface AppHeaderProps {
  user: AuthenticatedUser | null;
  unit: UnitContext | null;
  isLoadingUnit?: boolean;
  title?: string;
}

export function AppHeader({
  user,
  unit,
  isLoadingUnit = false,
  title = "New document",
}: AppHeaderProps) {
  const [time, setTime] = useState(() => formatTime(new Date()));
  const { isLoggingOut, handleLogout } = useLogout();
  const displayName = user?.displayName ?? user?.username ?? "User";
  const initials = getInitials(displayName);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTime(formatTime(new Date()));
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex min-h-topbar items-center border-b border-border bg-surface p-2.5 text-small text-text lg:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <img src="/pharmasynapse-lockup.svg" alt="PharmaDoc AI Logo" className="h-5 w-21 mt-1" />
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground font-bold">|</span>
          <span className="truncate text-h2 font-semibold">
            {title}
          </span>
        </div>
      </div>

      <div className="ml-4 hidden items-center gap-3 md:flex">
        <div className="inline-flex items-center gap-2 rounded-pill border border-border bg-muted px-3 py-1 text-small">
          {isLoadingUnit ? (
            <span
              className="h-4 w-16 animate-pulse rounded-pill bg-border"
              aria-hidden="true"
            />
          ) : (
            <span className="font-semibold text-primary-dark">
              {unit?.id ?? "No Unit"}
            </span>
          )}

          <span className="text-[var(--text-subtle)]">•</span>

          <span className="font-small text-subdued">
            {user ? USER_ROLE_LABELS[user.role] : "Prepared By"}
          </span>
        </div>

        <span className="inline-flex items-center gap-2 text-small text-subdued">
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
          onClick={handleLogout}
          disabled={isLoggingOut}
          title={`Signed in as ${displayName} — click to sign out`}
          aria-label="Sign out"
          className="group grid shrink-0 place-items-stretch overflow-hidden rounded-pill border border-border px-1.5 py-1.5 pr-3 text-left transition hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            className={`col-start-1 row-start-1 inline-flex items-center gap-2 transition-all duration-300 ease-out ${
              isLoggingOut
                ? "-translate-x-2 opacity-0"
                : "group-hover:-translate-x-2 group-hover:opacity-0 group-focus:-translate-x-2 group-focus:opacity-0"
            }`}
          >
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-micro font-semibold text-white">
              {initials}
            </span>
            <span className="max-w-32 truncate text-small font-semibold">{displayName}</span>
          </span>

          <span
            className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-1 text-small font-semibold text-danger transition-all duration-300 ease-out ${
              isLoggingOut
                ? "translate-x-0 opacity-100"
                : "translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus:translate-x-0 group-focus:opacity-100"
            }`}
          >
            {isLoggingOut ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="size-3.5" aria-hidden="true" />
            )}
            Sign Out
          </span>
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
