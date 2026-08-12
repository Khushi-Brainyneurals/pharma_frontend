import type { ReactNode } from "react";
import type { AuthenticatedUser } from "../../features/auth/api/auth.types";
import { AppHeader } from "../../features/new-document/components/AppHeader";
import { AppSidebar } from "../../features/new-document/components/AppSidebar";
import type { UnitContext } from "../../features/new-document/model/documentSelector.types";

interface AppShellProps {
  user: AuthenticatedUser | null;
  unit?: UnitContext | null;
  isLoadingUnit?: boolean;
  title?: string;
  children: ReactNode;
}

/**
 * The fixed header/sidebar shell shared by every authenticated page.
 * The shell itself never scrolls - only the `<main>` content area does,
 * so pages must not add their own height/overflow rules on top of this.
 */
export function AppShell({ user, unit = null, isLoadingUnit = false, title, children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-text">
      <AppHeader user={user} unit={unit} isLoadingUnit={isLoadingUnit} title={title} />
      <div className="flex min-h-0 flex-1">
        <AppSidebar user={user} />
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
