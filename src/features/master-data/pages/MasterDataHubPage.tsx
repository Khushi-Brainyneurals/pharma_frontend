import { Building2, ChevronRight, FileStack, Wrench } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { MASTER_DATA_ROUTES } from "../../../app/routing/routes";
import { getCompanyInfo } from "../api/companyInfo.api";
import { getMasterDataTypes } from "../api/stageDocuments.api";
import { ApprovalStatusBadge } from "../components/ApprovalStatusBadge";
import { MasterDataShell } from "../components/MasterDataShell";

interface HubSummary {
  companyStatus: string | null;
  companyName: string | null;
  setCount: number | null;
}

export function MasterDataHubPage() {
  const [summary, setSummary] = useState<HubSummary>({
    companyStatus: null,
    companyName: null,
    setCount: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    // Best-effort context for the cards - a failure here must not block the hub.
    void getCompanyInfo(controller.signal)
      .then((info) =>
        setSummary((current) => ({
          ...current,
          companyStatus: info.approval_status ?? null,
          companyName: info.company_name || null,
        })),
      )
      .catch(() => undefined);

    void getMasterDataTypes(controller.signal)
      .then((types) => setSummary((current) => ({ ...current, setCount: types.length })))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <MasterDataShell
      title="Master data"
      heading="Master data"
      description="The approved reference data every generated document is built from - company identity, the equipment and instrument lists, and the uploaded master formats."
      crumbs={[{ label: "Master data" }]}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <HubCard
          icon={Building2}
          title="Company information"
          description="Name, logo and typography applied to every document header."
          to={MASTER_DATA_ROUTES.company}
          meta={summary.companyName ?? undefined}
          badge={summary.companyStatus ? <ApprovalStatusBadge status={summary.companyStatus} /> : null}
        />
        <HubCard
          icon={Wrench}
          title="Equipment & instrument"
          description="The machine and instrument list masters, approved together."
          to={MASTER_DATA_ROUTES.equipmentInstrument}
        />
        <HubCard
          icon={FileStack}
          title="Stage documents"
          description="Blank approved master formats, per product type and document type."
          to={MASTER_DATA_ROUTES.types}
          meta={
            summary.setCount === null
              ? undefined
              : `${summary.setCount} ${summary.setCount === 1 ? "set" : "sets"} in progress`
          }
        />
      </div>
    </MasterDataShell>
  );
}

function HubCard({
  icon: Icon,
  title,
  description,
  to,
  meta,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  meta?: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-panel border border-border bg-surface p-5 shadow-sm transition hover:border-primary/40 hover:shadow-overlay focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div className="flex items-start gap-3">
        <span
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-primary-dark"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-h3 font-semibold">{title}</h2>
          <p className="mt-1 text-small leading-6 text-subdued">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {badge}
        {meta ? <span className="text-micro text-subdued">{meta}</span> : null}
        <span className="ml-auto inline-flex items-center gap-1 text-small font-semibold text-primary-dark">
          Open
          <ChevronRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
