import { UserRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../../app/layout/AppShell";
import { getCoverBomRoute } from "../../../app/routing/routes";
import { USER_ROLE_LABELS, type UserRole } from "../../auth/model/roles";
import { useAuthStore } from "../../auth/state/auth.store";
import { MasterDataBanner } from "../../master-data/components/MasterDataBanner";
import { DashboardCards, DashboardCardsSkeleton } from "../components/DashboardCards";
import { DashboardDocumentsTable } from "../components/DashboardDocumentsTable";
import { useDashboard } from "../hooks/useDashboard";
import type { DashboardDocument } from "../api/dashboard.types";

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const {
    role,
    cards,
    documents,
    selectedBucket,
    isLoading,
    isRefreshing,
    error,
    selectBucket,
    clearBucket,
    reload,
  } = useDashboard();

  const activeCard = cards.find((card) => card.key === selectedBucket);
  const roleLabel = role ? (USER_ROLE_LABELS[role as UserRole] ?? role) : user ? USER_ROLE_LABELS[user.role] : null;

  function handleCardSelect(key: string) {
    if (key === selectedBucket) {
      clearBucket();
      return;
    }
    selectBucket(key);
  }

  function handleOpenDocument(document: DashboardDocument) {
    if (!document.job_id) {
      return;
    }
    navigate(getCoverBomRoute(document.job_id));
  }

  return (
    <AppShell user={user} title="Dashboard">
      <div className="mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-h1 font-semibold text-text">Dashboard</h1>
              {roleLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-muted px-2.5 py-1 text-micro font-semibold text-subdued">
                  <UserRound className="size-3" aria-hidden="true" />
                  {roleLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 max-w-3xl text-small leading-6 text-subdued">
              Overview of your BMR documents and workflow status
            </p>
          </div>
        </header>

        <div className="space-y-6">
          {error ? (
            <MasterDataBanner
              tone="error"
              message={error}
              actions={
                <button type="button" className="preview-button-secondary min-h-8 px-3" onClick={reload}>
                  Retry
                </button>
              }
            />
          ) : null}

          {isLoading ? (
            <DashboardCardsSkeleton />
          ) : (
            <DashboardCards
              cards={cards}
              selectedBucket={selectedBucket}
              isRefreshing={isRefreshing}
              onSelect={handleCardSelect}
            />
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-h3 font-semibold text-text">Documents</h2>
            </div>

            <section className="rounded-panel border border-border bg-surface shadow-sm">
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
                <div className="mr-auto min-w-0">
                  <h3 className="truncate text-body font-semibold text-text">
                    {activeCard ? activeCard.label : "All documents"}
                  </h3>
                </div>

                {isLoading ? (
                  <span className="h-6 w-24 animate-pulse rounded-pill bg-muted" aria-hidden="true" />
                ) : (
                  <span className="rounded-pill bg-muted px-3 py-1 font-mono text-mono-sm text-subdued">
                    {documents.length} {documents.length === 1 ? "document" : "documents"}
                  </span>
                )}

                {selectedBucket ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-control border border-border px-3 py-1.5 text-small font-semibold text-subdued transition hover:bg-muted hover:text-text"
                    onClick={clearBucket}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Clear filter
                  </button>
                ) : null}
              </div>

              <DashboardDocumentsTable
                documents={documents}
                isLoading={isLoading || isRefreshing}
                emptyContext={activeCard?.label}
                onOpen={handleOpenDocument}
              />
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
