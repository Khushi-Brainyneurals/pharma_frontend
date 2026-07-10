export interface CreateBmrDocumentRequest {
  dosage_form: string;
  doc_type: string;
  user: string;
}

export interface CreateBmrDocumentResponse {
  document_id: string;
  dosage_form: string;
  doc_type: string;
  status: string;
}

export type BatchType = "exhibit" | "scale_up" | "commercial";

export type CommercialMode = "revision" | "validation";

export interface SetCoreInputsPayload {
  documentId: string;
  mfc: File;
  pp: File;
  otherDoc1?: File | null;
  otherDoc2?: File | null;
  otherDoc3?: File | null;
  batchSize: number;
  batchType: BatchType;
  commercialMode?: CommercialMode | "";
  headerFooterSize: number;
  footerTemplateNo: string;
  user?: string;
}

export interface SetCoreInputsResponse {
  document_id: string;
  status: "core_inputs_set";
  batch_size: number;
  batch_type: string;
  commercial_mode: string;
  header_footer_size: number;
  footer_template_no: string;
}
