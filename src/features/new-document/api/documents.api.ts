import { httpClient } from "../../../shared/api/httpClient";
import type {
  CreateBmrDocumentRequest,
  CreateBmrDocumentResponse,
  SetCoreInputsPayload,
  SetCoreInputsResponse,
} from "./documents.types";

export async function createBmrDocument(
  request: CreateBmrDocumentRequest,
): Promise<CreateBmrDocumentResponse> {
  const response = await httpClient.post<CreateBmrDocumentResponse>(
    "/api/bmr/documents",
    request,
  );

  return response.data;
}

export async function setCoreInputs(
  payload: SetCoreInputsPayload,
): Promise<SetCoreInputsResponse> {
  const formData = new FormData();

  formData.append("mfc", payload.mfc);
  formData.append("pp", payload.pp);

  if (payload.otherDoc1) formData.append("other_doc_1", payload.otherDoc1);
  if (payload.otherDoc2) formData.append("other_doc_2", payload.otherDoc2);
  if (payload.otherDoc3) formData.append("other_doc_3", payload.otherDoc3);

  formData.append("batch_size", String(payload.batchSize));
  formData.append("batch_type", payload.batchType);

  if (payload.batchType === "commercial" && payload.commercialMode) {
    formData.append("commercial_mode", payload.commercialMode);
  }

  formData.append("header_size", String(payload.headerSize));
  formData.append("footer_size", String(payload.footerSize));
  formData.append("footer_template_no", payload.footerTemplateNo);

  if (payload.user) {
    formData.append("user", payload.user);
  }

  const response = await httpClient.put<SetCoreInputsResponse>(
    `/api/bmr/documents/${encodeURIComponent(payload.documentId)}/core-inputs`,
    formData,
  );

  return response.data;
}
