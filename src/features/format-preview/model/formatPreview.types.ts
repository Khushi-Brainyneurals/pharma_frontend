export type PreviewFailureKind =
  | "empty"
  | "not-found"
  | "mfc-unreadable"
  | "company-configuration"
  | "service-unavailable"
  | "invalid-document"
  | "forbidden"
  | "session-expired"
  | "version-conflict";

export interface PreviewDocument {
  blob: Blob;
  objectUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  etag: string | null;
  lastModified: string | null;
  documentKey: string;
  extractionWarnings: string[];
  uploadedFilename: string | null;
}

export interface PreviewRequestError {
  kind: PreviewFailureKind;
  message: string;
  uploadedFilename: string | null;
  inputsPreserved: boolean;
  status: number | null;
}
