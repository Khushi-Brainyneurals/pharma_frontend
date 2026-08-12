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
  UsersRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { MASTER_DATA_ROUTES, ROUTES } from "../../../app/routing/routes";
import type { AuthenticatedUser } from "../../auth/api/auth.types";
import { useLogout } from "../../auth/hooks/useLogout";
import { USER_ROLES } from "../../auth/model/roles";
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

/** Sidebar entries that have a real destination; the rest stay inert. */
const ROUTED_SIDEBAR_ITEMS: Record<string, string | undefined> = {
  "new-document": ROUTES.newDocument,
  "master-data": MASTER_DATA_ROUTES.hub,
};

export function AppSidebar({ user }: AppSidebarProps) {
  const { isLoggingOut, handleLogout } = useLogout();

  return (
    <aside className="hidden border-r border-border bg-surface lg:flex lg:h-full lg:w-sidebar-w lg:shrink-0 lg:flex-col">
      <nav className="flex-1 px-3 py-4" aria-label="Primary">
        <ul className="space-y-1">
          {user?.role === USER_ROLES.ADMIN ? (
            <li>
              <NavLink
                to={ROUTES.employeeManagement}
                className={({ isActive }) => `flex min-h-row-h items-center gap-3 rounded-control px-3 text-small font-medium transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isActive ? "border border-primary/25 bg-accent-soft text-primary-dark" : "text-subdued hover:bg-muted hover:text-text"}`}
              >
                <UsersRound className="size-4 shrink-0" aria-hidden="true" />
                <span>Employee Management</span>
              </NavLink>
            </li>
          ) : null}
          {DOCUMENT_SIDEBAR_ITEMS.map((item) => {
            const Icon = iconMap[item.id as keyof typeof iconMap] ?? FileClock;
            const linkTo = ROUTED_SIDEBAR_ITEMS[item.id];

            if (linkTo) {
              return (
                <li key={item.id}>
                  <NavLink
                    to={linkTo}
                    className={({ isActive }) => `flex min-h-row-h items-center gap-3 rounded-control px-3 text-small font-medium transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isActive ? "border border-primary/25 bg-accent-soft text-primary-dark" : "text-subdued hover:bg-muted hover:text-text"}`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            }

            // Not in this release - inert rather than a link that goes nowhere.
            return (
              <li key={item.id}>
                <span
                  aria-disabled="true"
                  title="Not available in this release."
                  className="flex min-h-row-h cursor-not-allowed items-center gap-3 rounded-control px-3 text-small font-medium text-subdued/60"
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
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
