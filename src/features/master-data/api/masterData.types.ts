/** Mirrors the backend master-data + company-info schemas exactly. */

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export type ApprovalDecision = "approved" | "rejected";

export interface ApprovalState {
  category: string;
  product_type?: string | null;
  doc_type?: string | null;
  status?: string;
  submitted_by?: string | null;
  submitted_at?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  reject_reason?: string | null;
}

export interface CompanyInfo {
  company_name?: string;
  logo_path?: string;
  font_name?: string;
  font_size?: number | null;
  line_spacing?: number | null;
  updated_at?: string;
  is_complete?: boolean;
  missing?: string[];
  approval_status?: string;
}

export interface UpdateCompanyInfoPayload {
  company_name?: string | null;
  font_name?: string | null;
  font_size?: number | null;
  line_spacing?: number | null;
  user?: string;
}

/** System columns the backend appends to every master row. */
export interface MasterRowSystemFields {
  _row_id?: number;
  _is_active?: boolean;
  _created_by?: string;
  _created_at?: string;
}

/** One process step and the critical process parameters that apply to it. */
export interface MasterDataStep {
  step: string;
  cpp: string[];
}

export interface EquipmentRow extends MasterRowSystemFields {
  sr_no?: number | null;
  name_of_machine: string;
  capacity?: string;
  working_capacity?: string;
  machine_id_no?: string;
  stage?: string;
  processing_stage?: string;
  steps?: MasterDataStep[];
}

export interface InstrumentRow extends MasterRowSystemFields {
  sr_no?: number | null;
  name_of_instrument: string;
  instrument_id_no?: string;
  location?: string;
  stage?: string;
}

export interface MasterRowsResponse<TRow> {
  rows?: TRow[];
}

export interface UpsertRowsResponse {
  committed?: boolean;
  ids?: number[];
  status?: string;
}

export interface MasterDataTypeSummary {
  product_type: string;
  doc_type: string;
  uploaded_count?: number;
  required_count?: number;
}

/** One catalog-defined document slot inside a stage or the batch-level set. */
export interface ChecklistSlot {
  code: string;
  label: string;
  required?: boolean;
  renders_as?: string | null;
  uploaded?: boolean;
  file_name?: string;
  uploaded_by?: string;
  uploaded_at?: string;
}

/** A free-form extra document; addressed by numeric id, never by label. */
export interface OtherDocument {
  id: number;
  label: string;
  file_name: string;
  uploaded_by?: string;
  uploaded_at?: string;
}

export interface StageChecklist {
  product_type: string;
  doc_type: string;
  stage_key: string;
  slots?: ChecklistSlot[];
  others?: OtherDocument[];
  uploaded_count?: number;
  required_count?: number;
}

export interface MasterDataChecklist {
  product_type: string;
  doc_type: string;
  stages?: StageChecklist[];
  uploaded_count?: number;
  required_count?: number;
}

export interface OtherDocumentsChecklist {
  product_type: string;
  doc_type: string;
  slots?: ChecklistSlot[];
  uploaded_count?: number;
  required_count?: number;
}

export interface SavedDocument {
  code?: string | null;
  id?: number | null;
  label: string;
  file_name: string;
}

export interface DocumentHistoryEntry {
  label: string;
  file_name: string;
  uploaded_by?: string;
  uploaded_at?: string;
  deleted?: boolean;
}

/** A fetched preview payload; objectUrl must be revoked by the caller. */
export interface DocumentPreview {
  blob: Blob;
  objectUrl: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface MasterDataScope {
  productType: string;
  docType: string;
}

/** One selectable stage for the Equipment `stage` / Instrument `location` dropdowns. */
export interface StageOption {
  key: string;
  label: string;
}

/** Response shape for `GET /api/bmr/stages`. */
export interface StagesResponse {
  product_type?: string;
  doc_type?: string;
  stages?: StageOption[];
  supported?: boolean;
  message?: string;
}

/** Body shape for `PUT /master-data/equipments/{row_id}`. */
export interface UpdateEquipmentPayload {
  sr_no?: number | null;
  name_of_machine: string;
  capacity?: string;
  working_capacity?: string;
  machine_id_no?: string;
  stage?: string;
  processing_stage?: string;
  steps?: MasterDataStep[];
}

/** Body shape for `PUT /master-data/instruments/{row_id}`. */
export interface UpdateInstrumentPayload {
  sr_no?: number | null;
  name_of_instrument: string;
  instrument_id_no?: string;
  location?: string;
  stage?: string;
}
