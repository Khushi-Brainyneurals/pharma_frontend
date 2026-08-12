import type { DocumentStep } from "../../new-document/model/documentSelector.types";
import {
  DOCUMENT_TYPE_OPTIONS,
  DOSAGE_FORM_OPTIONS,
} from "../../new-document/model/documentSelector.config";
import type { MasterDataScope, MasterDataTypeSummary } from "../api/masterData.types";

/** Documents accept PDF or DOCX; the logo is PNG only. */
export const DOCUMENT_ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
export const LOGO_ACCEPT = ".png,image/png";
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const MASTER_DATA_STEPS: DocumentStep[] = [
  { id: "type", label: "Type" },
  { id: "stage-documents", label: "Stage documents" },
  { id: "batch-documents", label: "Batch documents" },
  { id: "preview", label: "Preview" },
];

export function validateDocumentFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isDocx = file.type === DOCX_MIME || name.endsWith(".docx");

  if (!isPdf && !isDocx) {
    return `${file.name} - unsupported format. Upload PDF or DOCX only.`;
  }

  if (file.size > DOCUMENT_MAX_BYTES) {
    return `${file.name} is larger than 25 MB.`;
  }

  if (file.size === 0) {
    return `${file.name} is empty.`;
  }

  return null;
}

export function validateLogoFile(file: File): string | null {
  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");

  if (!isPng) {
    return "The logo must be a PNG image.";
  }

  if (file.size > LOGO_MAX_BYTES) {
    return "The logo is larger than 5 MB.";
  }

  return null;
}

export interface MasterDataTypeCard extends MasterDataScope {
  label: string;
  productLabel: string;
  docLabel: string;
  uploadedCount: number;
  requiredCount: number;
  /** False for combinations the current release cannot author yet. */
  available: boolean;
  unavailableReason?: string;
  hasData: boolean;
}

/**
 * `GET /types` only lists sets that already have an upload, so the startable
 * combinations come from the same catalog the New document flow uses.
 */
export function buildTypeCards(summaries: MasterDataTypeSummary[]): MasterDataTypeCard[] {
  const cards = new Map<string, MasterDataTypeCard>();

  for (const dosageForm of DOSAGE_FORM_OPTIONS) {
    for (const documentType of DOCUMENT_TYPE_OPTIONS) {
      const scope = { productType: dosageForm.backendValue, docType: documentType.backendValue };
      const available = dosageForm.available && documentType.available;

      cards.set(keyOf(scope), {
        ...scope,
        label: `${dosageForm.label} · ${documentType.shortLabel ?? documentType.label}`,
        productLabel: dosageForm.label,
        docLabel: documentType.shortLabel ?? documentType.label,
        uploadedCount: 0,
        requiredCount: 0,
        available,
        unavailableReason: available
          ? undefined
          : (dosageForm.unavailableReason ?? documentType.unavailableReason),
        hasData: false,
      });
    }
  }

  for (const summary of summaries) {
    const scope = { productType: summary.product_type, docType: summary.doc_type };
    const existing = cards.get(keyOf(scope));

    cards.set(keyOf(scope), {
      ...scope,
      label: existing?.label ?? `${titleCase(summary.product_type)} · ${summary.doc_type.toUpperCase()}`,
      productLabel: existing?.productLabel ?? titleCase(summary.product_type),
      docLabel: existing?.docLabel ?? summary.doc_type.toUpperCase(),
      uploadedCount: summary.uploaded_count ?? 0,
      requiredCount: summary.required_count ?? 0,
      // A set with uploads is always reachable, whatever the catalog says.
      available: true,
      hasData: true,
    });
  }

  return [...cards.values()].sort(
    (first, second) => Number(second.hasData) - Number(first.hasData)
      || Number(second.available) - Number(first.available)
      || first.label.localeCompare(second.label),
  );
}

export function scopeLabel(scope: MasterDataScope) {
  return `${titleCase(scope.productType)} · ${scope.docType.toUpperCase()}`;
}

export function stageLabel(stageKey: string) {
  return titleCase(stageKey.replace(/[_-]+/g, " "));
}

function keyOf(scope: MasterDataScope) {
  return `${scope.productType}::${scope.docType}`;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
