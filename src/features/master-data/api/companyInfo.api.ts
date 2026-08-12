import { httpClient } from "../../../shared/api/httpClient";
import { normalizeMasterDataError } from "./masterData.errors";
import type {
  ApprovalDecision,
  ApprovalState,
  CompanyInfo,
  UpdateCompanyInfoPayload,
} from "./masterData.types";

const BASE = "/api/company-info";

export async function getCompanyInfo(signal?: AbortSignal) {
  try {
    const response = await httpClient.get<CompanyInfo>(BASE, { signal });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load company information.");
  }
}

/** Only the changed fields are sent - the backend writes just what it receives. */
export async function updateCompanyInfo(payload: UpdateCompanyInfoPayload, signal?: AbortSignal) {
  try {
    const response = await httpClient.put<CompanyInfo>(BASE, payload, { signal });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to save company information.");
  }
}

export async function uploadCompanyLogo(file: File, signal?: AbortSignal) {
  const body = new FormData();
  body.append("logo", file);

  try {
    const response = await httpClient.post<CompanyInfo>(`${BASE}/logo`, body, {
      signal,
      timeout: 120_000,
    });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to upload the company logo.");
  }
}

/** The stored PNG, fetched as a blob so the Bearer interceptor still applies. */
export async function getCompanyLogo(signal?: AbortSignal) {
  try {
    const response = await httpClient.get<Blob>(`${BASE}/logo`, {
      responseType: "blob",
      signal,
    });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load the company logo.");
  }
}

export async function getCompanyApproval(signal?: AbortSignal) {
  try {
    const response = await httpClient.get<ApprovalState>(`${BASE}/approval`, { signal });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load the approval status.");
  }
}

export async function submitCompanyApproval(signal?: AbortSignal) {
  try {
    const response = await httpClient.post<ApprovalState>(`${BASE}/approval/submit`, undefined, {
      signal,
    });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to submit company information for approval.");
  }
}

export async function decideCompanyApproval(
  decision: ApprovalDecision,
  reason?: string,
  signal?: AbortSignal,
) {
  try {
    const response = await httpClient.post<ApprovalState>(
      `${BASE}/approval/decide`,
      { reason: reason ?? "" },
      { params: { decision }, signal },
    );
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to record the approval decision.");
  }
}
