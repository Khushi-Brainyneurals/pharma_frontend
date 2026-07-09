import {
  Bell,
  ClipboardClock,
  FileClock,
  FilePlus,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  ReceiptText,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../app/routing/routes";
import { logout } from "../../auth/api/auth.api";
import type { AuthenticatedUser } from "../../auth/api/auth.types";
import { getStoredRefreshToken } from "../../auth/storage/auth.storage";
import { useAuthStore } from "../../auth/state/auth.store";
import { DOCUMENT_SIDEBAR_ITEMS } from "../model/documentSelector.config";

interface AppSidebarProps {
  user: AuthenticatedUser | null;
}

const iconMap = {
  "new-document": FilePlus,
  "status-board": LayoutDashboard,
  "version-history": History,
  notifications: Bell,
  "audit-trail": ClipboardClock,
  "master-data": ReceiptText,
};

export function AppSidebar({ user }: AppSidebarProps) {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const refreshToken = getStoredRefreshToken();

      if (refreshToken) {
        await logout({ refresh_token: refreshToken });
      }
    } catch {
      // Local cleanup must still win if the server-side logout request fails.
    } finally {
      clearSession();
      navigate(ROUTES.login, { replace: true });
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="hidden border-r border-border bg-surface lg:flex lg:h-full lg:w-sidebar-w lg:flex-col">
      <nav className="flex-1 px-3 py-4" aria-label="Primary">
        <ul className="space-y-1">
          {DOCUMENT_SIDEBAR_ITEMS.map((item) => {
            const Icon = iconMap[item.id as keyof typeof iconMap] ?? FileClock;
            const isActive = item.id === "new-document";

            return (
              <li key={item.id}>
                <a
                  href={isActive ? "/new" : "#"}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-row-h items-center gap-3 rounded-control px-3 text-small font-medium transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isActive
                      ? "border border-primary/25 bg-accent-soft text-primary-dark"
                      : "text-subdued hover:bg-muted hover:text-text"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-micro font-medium uppercase tracking-overline text-subdued">
              Signed in
            </p>
            <p className="mt-1 truncate text-small font-semibold text-text">
              {user?.username ?? user?.id ?? "U-0731"}
            </p>
          </div>

          <button
            type="button"
            aria-label="Log out"
            title="Log out"
            disabled={isLoggingOut}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border text-subdued transition hover:bg-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleLogout}
          >
            {isLoggingOut ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
