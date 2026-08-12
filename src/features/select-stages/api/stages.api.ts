import { httpClient } from "../../../shared/api/httpClient";
import type { StageParamsPayload } from "../types/stages.types";

/**
 * GET the last-saved params for one stage within a document.
 * Returns `{ parameters: [] }` if nothing has been saved yet.
 *
 * Endpoint: GET /api/bmr/documents/{documentId}/stages/{stageId}/params
 */
export async function getStageParams(
  documentId: string,
  stageId: string,
): Promise<unknown> {
  const response = await httpClient.get<unknown>(
    `/api/bmr/documents/${encodeURIComponent(documentId)}/stages/${encodeURIComponent(stageId)}/params`,
  );
  return response.data;
}

/**
 * POST (save) the params for one stage within a document.
 *
 * Endpoint: POST /api/bmr/documents/{documentId}/stages/{stageId}/params
 */
export async function setStageParams(
  documentId: string,
  stageId: string,
  payload: StageParamsPayload,
): Promise<void> {
  await httpClient.post(
    `/api/bmr/documents/${encodeURIComponent(documentId)}/stages/${encodeURIComponent(stageId)}/params`,
    payload,
  );
}

/**
 * PUT the list of selected stage keys for a document.
 * Called when the user clicks "Save & continue".
 *
 * Endpoint: PUT /api/bmr/documents/{documentId}/stages
 */
export async function setStages(
  documentId: string,
  stageIds: string[],
): Promise<void> {
  await httpClient.put(
    `/api/bmr/documents/${encodeURIComponent(documentId)}/stages`,
    { stage_keys: stageIds },
  );
}
