import axios, { type AxiosResponse } from "axios";
import { httpClient } from "../../../shared/api/httpClient";
import type { PreviewDocument } from "../../format-preview/model/formatPreview.types";
import type {
  CoverBomDocumentData,
  CoverBomFailureKind,
  CoverBomRequestError,
  GenerateBomInput,
  GenerateBomResponse,
  UpdateBomPayload,
  UpdateBomResponse,
} from "../model/coverBom.types";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function getCoverBomDocument(documentId: string, signal?: AbortSignal) {
  try {
    const response = await httpClient.get<CoverBomDocumentData>(
      `/api/bmr/documents/${encodeURIComponent(documentId)}`,
      { signal, timeout: 30_000 },
    );
    return normalizeDocument(response.data);
  } catch (error) {
    throw await normalizeCoverBomError(error);
  }
}

export async function generateCoverBom(
  documentId: string,
  input: GenerateBomInput,
  signal?: AbortSignal,
) {
  try {
    const response = await httpClient.post<GenerateBomResponse>(
      `/api/bmr/documents/${encodeURIComponent(documentId)}/generate-bom`,
      undefined,
      {
        params: { lot_size: input.lotSize.trim(), volume: Number(input.volume) },
        signal,
        timeout: 300_000,
      },
    );
    return { ...response.data, warnings: stringArray(response.data.warnings) };
  } catch (error) {
    throw await normalizeCoverBomError(error);
  }
}

export async function updateCoverBom(
  documentId: string,
  payload: UpdateBomPayload,
  previewEtag?: string | null,
  signal?: AbortSignal,
) {
  try {
    const response = await httpClient.patch<UpdateBomResponse>(
      `/api/bmr/documents/${encodeURIComponent(documentId)}/bom`,
      payload,
      {
        signal,
        timeout: 300_000,
        headers: previewEtag ? { "If-Match": `"${previewEtag}"` } : undefined,
      },
    );
    return response.data;
  } catch (error) {
    throw await normalizeCoverBomError(error);
  }
}

export async function fetchCoverBomPreview(
  documentId: string,
  versionHint?: string,
  signal?: AbortSignal,
): Promise<PreviewDocument> {
  try {
    const response = await httpClient.get<Blob>(
      `/api/bmr/documents/${encodeURIComponent(documentId)}/bom-preview`,
      {
        responseType: "blob",
        signal,
        timeout: 60_000,
        params: versionHint ? { version: versionHint } : undefined,
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      },
    );
    return parsePreview(response, documentId);
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw await normalizeCoverBomError(error);
  }
}

function normalizeDocument(value: CoverBomDocumentData): CoverBomDocumentData {
  return {
    ...value,
    layers: stringArray(value.layers),
    stages: Array.isArray(value.stages) ? value.stages : [],
    ingredients: Array.isArray(value.ingredients) ? value.ingredients : [],
    preview_url: typeof value.preview_url === "string" ? value.preview_url : "",
  };
}

function parsePreview(response: AxiosResponse<Blob>, documentId: string): PreviewDocument {
  const blob = response.data;
  const headerType = stringHeader(response.headers["content-type"]);
  const mimeType = blob.type || headerType || DOCX_MIME;
  if (!(blob instanceof Blob) || blob.size === 0 || !isDocxMime(mimeType)) {
    throw requestError("invalid-document", "The backend returned an empty or unsupported BOM document.", response.status);
  }

  const etag = cleanEtag(stringHeader(response.headers.etag));
  const lastModified = stringHeader(response.headers["last-modified"]);
  const contentLength = Number(stringHeader(response.headers["content-length"]));
  const filename = getFilename(stringHeader(response.headers["content-disposition"]))
    ?? `BMR-${safeFilenamePart(documentId)}-cover-bom.docx`;
  const version = etag ?? lastModified ?? `${blob.size}-${Date.now()}`;

  return {
    blob,
    objectUrl: URL.createObjectURL(blob),
    filename,
    mimeType,
    size: Number.isFinite(contentLength) && contentLength > 0 ? contentLength : blob.size,
    etag,
    lastModified,
    documentKey: stableDocumentKey(documentId, version),
    extractionWarnings: [],
    uploadedFilename: null,
  };
}

export async function normalizeCoverBomError(error: unknown): Promise<CoverBomRequestError> {
  if (isCoverBomRequestError(error)) return error;
  if (!axios.isAxiosError(error)) {
    return requestError("service-unavailable", "The Cover + BOM service is temporarily unavailable.");
  }
  const status = error.response?.status ?? null;
  const message = await getErrorMessage(error.response?.data);
  const code = message.toLowerCase();
  if (status === 401) return requestError("session-expired", "Your session has expired.", status);
  if (status === 403) return requestError("forbidden", "You do not have permission to change this Cover + BOM.", status);
  if (status === 404 && /document.*not found|unknown document/.test(code)) return requestError("not-found", message, status);
  if (status === 404) return requestError("not-generated", "No Cover + BOM has been generated yet.", status);
  if (status === 409 || status === 412) return requestError("version-conflict", "A newer BOM version exists. Reload it before making corrections.", status);
  if (status === 400 || status === 422) return requestError("validation", message, status);
  return requestError("service-unavailable", message || "The Cover + BOM service is temporarily unavailable.", status);
}

function requestError(kind: CoverBomFailureKind, message: string, status: number | null = null) {
  return { kind, message: safeMessage(message), status } satisfies CoverBomRequestError;
}

function isCoverBomRequestError(value: unknown): value is CoverBomRequestError {
  return Boolean(value && typeof value === "object" && "kind" in value && "message" in value);
}

async function getErrorMessage(value: unknown) {
  let parsed = value;
  if (value instanceof Blob) {
    const text = await value.text();
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }
  if (typeof parsed === "string") return safeMessage(parsed);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    for (const key of ["message", "detail", "error", "code"]) {
      if (typeof record[key] === "string" && record[key].trim()) return safeMessage(record[key] as string);
    }
  }
  return "The Cover + BOM service is temporarily unavailable.";
}

function getFilename(value: string | null) {
  if (!value) return null;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return sanitizeFilename(decodeURIComponent(encoded)); } catch { return sanitizeFilename(encoded); }
  }
  const plain = value.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1];
  return plain ? sanitizeFilename(plain) : null;
}

function sanitizeFilename(value: string) { return value.trim().replace(/[\\/:*?"<>|]/g, "-"); }
function safeFilenamePart(value: string) { return value.replace(/[^a-z0-9_-]/gi, "-"); }
function cleanEtag(value: string | null) { return value?.replace(/^W\//, "").replace(/^"|"$/g, "") ?? null; }
function stringHeader(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function safeMessage(value: string) { return value.replace(/https?:\/\/\S+/gi, "the document service").replace(/bearer\s+[a-z0-9._~-]+/gi, "authentication credentials").slice(0, 360); }
function isDocxMime(value: string) {
  const normalized = value.toLowerCase().split(";")[0].trim();
  return normalized === DOCX_MIME || normalized === "application/octet-stream" || normalized === "application/zip";
}
function stableDocumentKey(documentId: string, version: string) {
  let hash = 2166136261;
  for (const character of `${documentId}:${version}`) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `${safeFilenamePart(documentId)}-${(hash >>> 0).toString(36)}`.slice(0, 128);
}
