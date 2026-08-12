import { httpClient } from "../../../shared/api/httpClient";
import { normalizeMasterDataError } from "./masterData.errors";
import type { StagesResponse } from "./masterData.types";

export interface GetStagesParams {
  productType: string;
  docType: string;
}

/** Backs the Equipment `stage` and Instrument `location` dropdowns - both share this one catalog. */
export async function getStages({ productType, docType }: GetStagesParams, signal?: AbortSignal) {
  try {
    const response = await httpClient.get<StagesResponse>("/api/bmr/stages", {
      params: { product_type: productType, doc_type: docType },
      signal,
    });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load stage options.");
  }
}
