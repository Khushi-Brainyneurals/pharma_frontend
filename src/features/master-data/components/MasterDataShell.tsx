import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { DocumentStep } from "../../new-document/model/documentSelector.types";
import { useAuthStore } from "../../auth/state/auth.store";
import { AppShell } from "../../../app/layout/AppShell";
import { DocumentStepper } from "../../new-document/components/DocumentStepper";
import { useDocumentSelectorData } from "../../new-document/hooks/useDocumentSelectorData";

export interface Crumb {
  label: string;
  to?: string;
}

interface MasterDataShellProps {
  title: string;
  heading: string;
  description?: string;
  crumbs?: Crumb[];
  steps?: DocumentStep[];
  activeStepId?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** The page chrome every Master data screen shares. */
export function MasterDataShell({
  title,
  heading,
  description,
  crumbs = [],
  steps,
  activeStepId,
  eyebrow,
  actions,
  children,
}: MasterDataShellProps) {
  const user = useAuthStore((state) => state.user);
  const { context, isLoading } = useDocumentSelectorData(user);

  return (
    <AppShell user={user} unit={context?.unit ?? null} isLoadingUnit={isLoading} title={title}>
      {steps && activeStepId ? (
        <div className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto">
            <DocumentStepper steps={steps} activeStepId={activeStepId} />
          </div>
        </div>
      ) : null}

      <div className="mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {crumbs.length ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1 text-small text-subdued">
              {crumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="rounded-sm text-primary-dark hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="font-medium text-text">
                      {crumb.label}
                    </span>
                  )}
                  {index < crumbs.length - 1 ? (
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  ) : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-micro font-semibold uppercase tracking-overline text-primary-dark">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-1 text-h1 font-semibold">{heading}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-small leading-6 text-subdued">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
        </header>

        {children}
      </div>
    </AppShell>
  );
}
