import type { AxiosResponse } from "axios";
import { httpClient } from "../../../shared/api/httpClient";
import { normalizeMasterDataError } from "./masterData.errors";
import type {
  ApprovalDecision,
  ApprovalState,
  DocumentHistoryEntry,
  DocumentPreview,
  MasterDataChecklist,
  MasterDataScope,
  MasterDataTypeSummary,
  OtherDocumentsChecklist,
  SavedDocument,
  StageChecklist,
} from "./masterData.types";

const BASE = "/api/master-data";

export type UploadProgressHandler = (percent: number) => void;

function scopeUrl({ productType, docType }: MasterDataScope) {
  return `${BASE}/${encodeURIComponent(productType)}/${encodeURIComponent(docType)}`;
}

function stageUrl(scope: MasterDataScope, stageKey: string) {
  return `${scopeUrl(scope)}/stages/${encodeURIComponent(stageKey)}`;
}

export async function getMasterDataTypes(signal?: AbortSignal) {
  try {
    const response = await httpClient.get<MasterDataTypeSummary[]>(`${BASE}/types`, { signal });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load the master data sets.");
  }
}

export async function getChecklist(scope: MasterDataScope, signal?: AbortSignal) {
  try {
    const response = await httpClient.get<MasterDataChecklist>(`${scopeUrl(scope)}/checklist`, {
      signal,
    });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load the stage document checklist.");
  }
}

export async function getStageChecklist(
  scope: MasterDataScope,
  stageKey: string,
  signal?: AbortSignal,
) {
  try {
    const response = await httpClient.get<StageChecklist>(`${stageUrl(scope, stageKey)}/checklist`, {
      signal,
    });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load this stage's checklist.");
  }
}

/** Uploading the same doc_code again is how Replace works. */
export async function saveStageDocument(
  scope: MasterDataScope,
  stageKey: string,
  docCode: string,
  file: File,
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
) {
  return upload(
    `${stageUrl(scope, stageKey)}/documents/${encodeURIComponent(docCode)}`,
    file,
    onProgress,
    signal,
  );
}

export async function removeStageDocument(
  scope: MasterDataScope,
  stageKey: string,
  docCode: string,
  signal?: AbortSignal,
) {
  try {
    await httpClient.delete(`${stageUrl(scope, stageKey)}/documents/${encodeURIComponent(docCode)}`, {
      signal,
    });
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to remove this document.");
  }
}

export async function previewStageDocument(
  scope: MasterDataScope,
  stageKey: string,
  docCode: string,
  signal?: AbortSignal,
) {
  return preview(
    `${stageUrl(scope, stageKey)}/documents/${encodeURIComponent(docCode)}/preview`,
    signal,
  );
}

export async function getStageDocumentHistory(
  scope: MasterDataScope,
  stageKey: string,
  docCode: string,
  signal?: AbortSignal,
) {
  return history(
    `${stageUrl(scope, stageKey)}/documents/${encodeURIComponent(docCode)}/history`,
    signal,
  );
}

/** Stage-level extras: the uploaded file's own name becomes the label. */
export async function saveOtherStageDocument(
  scope: MasterDataScope,
  stageKey: string,
  file: File,
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
) {
  return upload(`${stageUrl(scope, stageKey)}/documents/other`, file, onProgress, signal);
}

export async function replaceOtherStageDocument(
  scope: MasterDataScope,
  stageKey: string,
  otherId: number,
  file: File,
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
) {
  return upload(
    `${stageUrl(scope, stageKey)}/documents/other/${otherId}`,
    file,
    onProgress,
    signal,
  );
}

export async function removeOtherStageDocument(
  scope: MasterDataScope,
  stageKey: string,
  otherId: number,
  signal?: AbortSignal,
) {
  try {
    await httpClient.delete(`${stageUrl(scope, stageKey)}/documents/other/${otherId}`, { signal });
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to remove this document.");
  }
}

export async function previewOtherStageDocument(
  scope: MasterDataScope,
  stageKey: string,
  otherId: number,
  signal?: AbortSignal,
) {
  return preview(`${stageUrl(scope, stageKey)}/documents/other/${otherId}/preview`, signal);
}

export async function getOtherStageDocumentHistory(
  scope: MasterDataScope,
  stageKey: string,
  otherId: number,
  signal?: AbortSignal,
) {
  return history(`${stageUrl(scope, stageKey)}/documents/other/${otherId}/history`, signal);
}

/** Batch-level documents - a fixed catalog, separate from the stage uploads. */
export async function getOtherDocumentsChecklist(scope: MasterDataScope, signal?: AbortSignal) {
  try {
    const response = await httpClient.get<OtherDocumentsChecklist>(
      `${scopeUrl(scope)}/other-documents/checklist`,
      { signal },
    );
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load the batch document checklist.");
  }
}

export async function saveOtherDocument(
  scope: MasterDataScope,
  docCode: string,
  file: File,
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
) {
  return upload(
    `${scopeUrl(scope)}/other-documents/${encodeURIComponent(docCode)}`,
    file,
    onProgress,
    signal,
  );
}

export async function removeOtherDocument(
  scope: MasterDataScope,
  docCode: string,
  signal?: AbortSignal,
) {
  try {
    await httpClient.delete(`${scopeUrl(scope)}/other-documents/${encodeURIComponent(docCode)}`, {
      signal,
    });
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to remove this document.");
  }
}

export async function previewOtherDocument(
  scope: MasterDataScope,
  docCode: string,
  signal?: AbortSignal,
) {
  return preview(`${scopeUrl(scope)}/other-documents/${encodeURIComponent(docCode)}/preview`, signal);
}

export async function getOtherDocumentHistory(
  scope: MasterDataScope,
  docCode: string,
  signal?: AbortSignal,
) {
  return history(`${scopeUrl(scope)}/other-documents/${encodeURIComponent(docCode)}/history`, signal);
}

export async function getStageDocumentsApproval(scope: MasterDataScope, signal?: AbortSignal) {
  try {
    const response = await httpClient.get<ApprovalState>(`${scopeUrl(scope)}/approval`, { signal });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load the approval status.");
  }
}

export async function submitStageDocumentsApproval(scope: MasterDataScope, signal?: AbortSignal) {
  try {
    const response = await httpClient.post<ApprovalState>(
      `${scopeUrl(scope)}/approval/submit`,
      undefined,
      { signal },
    );
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to submit these documents for approval.");
  }
}

export async function decideStageDocumentsApproval(
  scope: MasterDataScope,
  decision: ApprovalDecision,
  reason?: string,
  signal?: AbortSignal,
) {
  try {
    const response = await httpClient.post<ApprovalState>(
      `${scopeUrl(scope)}/approval/decide`,
      { reason: reason ?? "" },
      { params: { decision }, signal },
    );
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to record the approval decision.");
  }
}

async function upload(
  url: string,
  file: File,
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
): Promise<SavedDocument> {
  const body = new FormData();
  body.append("file", file);

  try {
    const response = await httpClient.post<SavedDocument>(url, body, {
      signal,
      timeout: 300_000,
      onUploadProgress: onProgress
        ? (event) => onProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0)
        : undefined,
    });
    return response.data;
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to upload this document.");
  }
}

async function history(url: string, signal?: AbortSignal): Promise<DocumentHistoryEntry[]> {
  try {
    const response = await httpClient.get<DocumentHistoryEntry[]>(url, { signal });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to load this document's history.");
  }
}

async function preview(url: string, signal?: AbortSignal): Promise<DocumentPreview> {
  try {
    const response = await httpClient.get<Blob>(url, { responseType: "blob", signal, timeout: 60_000 });
    return toPreview(response);
  } catch (error) {
    throw await normalizeMasterDataError(error, "Unable to open this document.");
  }
}

function toPreview(response: AxiosResponse<Blob>): DocumentPreview {
  const blob = response.data;
  const headerType = header(response.headers["content-type"]);
  const mimeType = blob.type || headerType || "application/octet-stream";
  const filename = filenameFrom(header(response.headers["content-disposition"])) ?? "document";

  return { blob, objectUrl: URL.createObjectURL(blob), filename, mimeType, size: blob.size };
}

function filenameFrom(value: string | null) {
  if (!value) {
    return null;
  }

  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];

  if (encoded) {
    try {
      return sanitize(decodeURIComponent(encoded));
    } catch {
      return sanitize(encoded);
    }
  }

  const plain = value.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1];
  return plain ? sanitize(plain) : null;
}

function sanitize(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "-");
}

function header(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
