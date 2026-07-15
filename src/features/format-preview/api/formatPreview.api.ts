import axios, { type AxiosResponse } from "axios";
import { httpClient } from "../../../shared/api/httpClient";
import type {
  PreviewDocument,
  PreviewFailureKind,
  PreviewRequestError,
} from "../model/formatPreview.types";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function fetchFormatPreview(
  documentId: string,
  signal?: AbortSignal,
): Promise<PreviewDocument> {
  try {
    const response = await httpClient.get<Blob>(
      `/api/bmr/documents/${encodeURIComponent(documentId)}/format-preview`,
      { responseType: "blob", signal, timeout: 30_000 },
    );

    return parsePreviewResponse(response, documentId);
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }

    throw await normalizePreviewError(error);
  }
}

function parsePreviewResponse(response: AxiosResponse<Blob>, documentId: string): PreviewDocument {
  const blob = response.data;
  const headerType = stringHeader(response.headers["content-type"]);
  const mimeType = blob.type || headerType || DOCX_MIME;

  if (!(blob instanceof Blob) || blob.size === 0 || !isDocxMime(mimeType)) {
    throw previewError(
      "invalid-document",
      "The preview service returned an empty or unsupported document. Generate the preview again.",
      response.status,
    );
  }

  const etag = cleanEtag(stringHeader(response.headers.etag));
  const lastModified = stringHeader(response.headers["last-modified"]);
  const filename = getFilename(stringHeader(response.headers["content-disposition"]))
    ?? `BMR-${safeFilenamePart(documentId)}-page-1-preview.docx`;
  const warnings = parseWarnings(stringHeader(response.headers["x-extraction-warnings"]));
  const suppliedKey = stringHeader(response.headers["x-document-key"]);

  return {
    blob,
    objectUrl: URL.createObjectURL(blob),
    filename,
    mimeType,
    size: blob.size,
    etag,
    lastModified,
    documentKey: suppliedKey ?? stableDocumentKey(documentId, etag ?? lastModified ?? String(blob.size)),
    extractionWarnings: warnings,
    uploadedFilename: stringHeader(response.headers["x-uploaded-filename"]),
  };
}

export async function normalizePreviewError(error: unknown): Promise<PreviewRequestError> {
  if (isPreviewRequestError(error)) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return previewError("service-unavailable", "The preview service is temporarily unavailable.");
  }

  const status = error.response?.status ?? null;
  const details = await readErrorDetails(error.response?.data);
  const code = [details.code, details.error, details.detail, details.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (status === 401) return previewError("session-expired", "Your session has expired.", status);
  if (status === 403) return previewError("forbidden", "You do not have permission to open this preview.", status);
  if (status === 404 && /document.*not found|unknown document/.test(code)) {
    return previewError("not-found", details.message ?? "This document could not be found.", status);
  }
  if (status === 404) {
    return previewError("empty", details.message ?? "No Page-1 preview has been generated yet.", status);
  }
  if (status === 409 && /version|conflict|etag|revision/.test(code)) {
    return previewError("version-conflict", "A newer preview version is available. Reload before editing.", status);
  }
  if (/mfc|parse|unread|ocr|source document/.test(code) && (status === 400 || status === 422)) {
    return {
      ...previewError(
        "mfc-unreadable",
        details.message ?? "We could not read the uploaded MFC. Re-upload it from Core inputs.",
        status,
      ),
      uploadedFilename: details.filename,
    };
  }
  if (/letterhead|company standard|logo|header|footer|standard font/.test(code)) {
    return previewError(
      "company-configuration",
      details.message ?? "Company letterhead is not configured yet. Ask an Admin to complete Company Standard Info.",
      status,
    );
  }

  return previewError(
    "service-unavailable",
    details.message ?? "The preview service is temporarily unavailable. Your saved Core inputs are unchanged.",
    status,
  );
}

function previewError(
  kind: PreviewFailureKind,
  message: string,
  status: number | null = null,
): PreviewRequestError {
  return { kind, message, uploadedFilename: null, inputsPreserved: true, status };
}

function isPreviewRequestError(value: unknown): value is PreviewRequestError {
  return Boolean(value && typeof value === "object" && "kind" in value && "message" in value);
}

async function readErrorDetails(value: unknown) {
  let parsed = value;
  if (value instanceof Blob) {
    const text = await value.text();
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { code: null, error: null, detail: null, message: typeof parsed === "string" ? parsed : null, filename: null };
  }

  const record = parsed as Record<string, unknown>;
  return {
    code: asString(record.code),
    error: asString(record.error),
    detail: asString(record.detail),
    message: safeBackendMessage(asString(record.message) ?? asString(record.detail)),
    filename: asString(record.filename) ?? asString(record.uploaded_filename),
  };
}

function getFilename(contentDisposition: string | null) {
  if (!contentDisposition) return null;
  const encoded = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return sanitizeFilename(decodeURIComponent(encoded)); } catch { return sanitizeFilename(encoded); }
  }
  return sanitizeFilename(contentDisposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1] ?? "") || null;
}

function sanitizeFilename(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "-");
}

function parseWarnings(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  } catch {
    return value.split("|").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function stableDocumentKey(documentId: string, version: string) {
  const input = `${documentId}:${version}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${safeFilenamePart(documentId)}-${(hash >>> 0).toString(36)}`.slice(0, 128);
}

function safeFilenamePart(value: string) { return value.replace(/[^a-z0-9_-]/gi, "-"); }
function cleanEtag(value: string | null) { return value?.replace(/^W\//, "").replace(/^"|"$/g, "") ?? null; }
function stringHeader(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function asString(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function safeBackendMessage(value: string | null) {
  if (!value) return null;
  return value
    .replace(/https?:\/\/\S+/gi, "the document service")
    .replace(/bearer\s+[a-z0-9._~-]+/gi, "authentication credentials")
    .slice(0, 320);
}
function isDocxMime(value: string) {
  const normalized = value.toLowerCase().split(";")[0].trim();
  return normalized === DOCX_MIME || normalized === "application/octet-stream" || normalized === "application/zip";
}
