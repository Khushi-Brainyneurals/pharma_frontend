import type { PreviewDocument } from "../../format-preview/model/formatPreview.types";

export type CoverBomMode =
  | "initial-loading"
  | "not-generated"
  | "generating"
  | "preview-loading"
  | "preview-ready"
  | "preview-ready-with-warnings"
  | "edit"
  | "edit-dirty"
  | "saving"
  | "regenerating"
  | "save-success"
  | "generation-failure"
  | "preview-failure"
  | "validation-failure"
  | "permission-denied"
  | "session-timeout"
  | "version-conflict";

export interface BomIngredient {
  sr_no: number;
  material_code: string;
  ingredient_name: string;
  uom: string;
  layer: string;
  part: string;
  qty_per_mfc_batch: number;
  qty_required_production: number;
}

export interface CoverBomDocumentData {
  job_id: string;
  bmr_number: string;
  product_name: string;
  product_type: string;
  doc_type: string;
  batch_type: string;
  commercial_mode: string;
  batch_size: number;
  layers: string[];
  stages: unknown[];
  ingredients: BomIngredient[];
  preview_url: string;
}

export interface GenerateBomInput {
  lotSize: string;
  volume: string;
}

export interface GenerateBomResponse {
  document_id: string;
  bmr_number: string;
  product_name: string;
  layers: string[];
  ingredients_count: number;
  warnings: string[];
  preview_url: string;
  status: string;
}

export interface EditableBomState {
  batchSize: string;
  batchType: string;
  commercialMode: string;
  ingredients: Array<{
    rowKey: string;
    srNo: string;
    ingredientName: string;
    uom: string;
  }>;
}

export interface IngredientEditPayload {
  ingredient_name: string;
  sr_no: number;
  uom: string;
}

export interface UpdateBomPayload {
  batch_size?: number;
  core?: {
    batch_type?: string;
    commercial_mode?: string;
    source_type?: string;
  };
  ingredient_edits?: IngredientEditPayload[];
  user: string;
}

export interface UpdateBomResponse {
  job_id: string;
  batch_size: number;
  batch_type: string;
  commercial_mode: string;
  ingredient_edits_applied: number;
  ingredients_count: number;
  preview_url: string;
  preview_path: string;
  status: string;
}

export type CoverBomFailureKind =
  | "not-generated"
  | "not-found"
  | "forbidden"
  | "session-expired"
  | "version-conflict"
  | "invalid-document"
  | "validation"
  | "service-unavailable";

export interface CoverBomRequestError {
  kind: CoverBomFailureKind;
  message: string;
  status: number | null;
}

export interface CoverBomSnapshot {
  data: CoverBomDocumentData;
  preview: PreviewDocument;
  warnings: string[];
}
