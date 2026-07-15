import { ArrowLeft, ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../../app/routing/routes";
import { USER_ROLES, USER_ROLE_LABELS } from "../../auth/model/roles";
import { useAuthStore } from "../../auth/state/auth.store";
import { PreviewStateCard } from "../../format-preview/components/PreviewStateCard";
import { AppHeader } from "../../new-document/components/AppHeader";
import { AppSidebar } from "../../new-document/components/AppSidebar";
import { DocumentStepper } from "../../new-document/components/DocumentStepper";
import { useDocumentSelectorData } from "../../new-document/hooks/useDocumentSelectorData";
import { DOCUMENT_SELECTOR_STEPS } from "../../new-document/model/documentSelector.config";

export function PreparedByCoverBomRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { documentId = "" } = useParams();
  const { context, isLoading } = useDocumentSelectorData(user);
  if (user?.role === USER_ROLES.PREPARED_BY) return children;
  return <div className="min-h-screen bg-background text-text"><AppHeader user={user} unit={context?.unit ?? null} isLoadingUnit={isLoading} /><div className="lg:grid lg:h-[calc(100vh-var(--topbar-h))] lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)]"><AppSidebar user={user} /><main className="min-w-0"><div className="border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1180px]"><DocumentStepper steps={DOCUMENT_SELECTOR_STEPS} activeStepId="cover-bom" /></div></div><div className="border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1180px]"><p className="text-micro font-semibold uppercase tracking-overline text-primary-dark">Step 4 of 7</p><h1 className="mt-1 text-h1 font-semibold">Cover + BOM</h1><p className="mt-1 text-small text-subdued">Document {documentId || "—"}</p></div></div><PreviewStateCard icon={ShieldX} title="Permission denied" message="The Cover + BOM generation and correction workflow is available only to the Prepared By role." tone="permission" detail={<><strong className="text-text">Signed in:</strong> {user?.displayName ?? user?.username ?? user?.id ?? "Unknown user"}<br /><strong className="text-text">Role:</strong> {user ? USER_ROLE_LABELS[user.role] : "Unknown"}</>} actions={<button type="button" className="preview-button-secondary" onClick={() => navigate(ROUTES.statusBoard)}><ArrowLeft className="size-4" />Back to dashboard</button>} /></main></div></div>;
}
