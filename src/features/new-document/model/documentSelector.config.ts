import type { DocumentOption, DocumentStep, SidebarItem } from "./documentSelector.types";
import {
  ClipboardCheck,
  Droplets,
  FileCheck2,
  FileText,
  FlaskConical,
  Package,
  Pill,
  HandCoins,
  Tablets,
  Bubbles,
} from "lucide-react";

export const RELEASE_TOOLTIP =
  "Not in this release. Tablet · BMR is the current release.";

export const DOCUMENT_SELECTOR_STEPS: DocumentStep[] = [
  { id: "type", label: "Type" },
  { id: "inputs", label: "Core Inputs" },
  { id: "preview", label: "Preview" },
  { id: "cover-bom", label: "Cover + BOM" },
  { id: "stages", label: "Select Stages" },
  { id: "stage-input", label: "Stage input" },
  { id: "generate-submit", label: "Generate & submit" },
];

export const DOSAGE_FORM_OPTIONS: DocumentOption[] = [
  {
    id: "tablet",
    label: "Tablet",
    description: "Compressed solid dose",
    available: true,
    icon: Tablets,
  },
  {
    id: "capsule",
    label: "Capsule",
    description: "",
    available: false,
    unavailableReason: RELEASE_TOOLTIP,
    icon: Pill,
  },
  {
    id: "cream",
    label: "Cream",
    description: "",
    available: false,
    unavailableReason: RELEASE_TOOLTIP,
    icon: HandCoins,
  },
  {
    id: "ointment",
    label: "Ointment",
    description: "",
    available: false,
    unavailableReason: RELEASE_TOOLTIP,
    icon: FlaskConical,
  },
  {
    id: "powder",
    label: "Powder",
    description: "",
    available: false,
    unavailableReason: RELEASE_TOOLTIP,
    icon: Bubbles,
  },
  {
    id: "oral-liquid",
    label: "Oral Liquid",
    description: "",
    available: false,
    unavailableReason: RELEASE_TOOLTIP,
    icon: Droplets,
  },
];

export const DOCUMENT_TYPE_OPTIONS: DocumentOption[] = [
  {
    id: "bmr",
    label: "Batch Manufacturing Record",
    shortLabel: "BMR",
    description: "Tablet dosage form",
    available: true,
    icon: FileText,
  },
  {
    id: "bpr",
    label: "Batch Packaging Record",
    shortLabel: "BPR",
    description: "",
    available: false,
    unavailableReason: RELEASE_TOOLTIP,
    icon: Package,
  },
  {
    id: "pvp",
    label: "Process Validation Protocol",
    shortLabel: "PVP",
    description: "",
    available: false,
    unavailableReason: RELEASE_TOOLTIP,
    icon: ClipboardCheck,
  },
  {
    id: "pvr",
    label: "Process Validation Report",
    shortLabel: "PVR",
    description: "",
    available: false,
    unavailableReason: RELEASE_TOOLTIP,
    icon: FileCheck2,
  },
];

export const DOCUMENT_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "new-document", label: "New document" },
  { id: "status-board", label: "Status board" },
  { id: "version-history", label: "Version history" },
  { id: "notifications", label: "Notifications" },
  { id: "audit-trail", label: "Audit trail" },
  { id: "password", label: "Password" },
];
