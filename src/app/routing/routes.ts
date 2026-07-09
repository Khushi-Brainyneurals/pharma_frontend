export const ROUTES = {
  login: "/login",
  newDocument: "/new",
  statusBoard: "/session",
  documentInputs: "/documents/:documentId/inputs",
  documentPreview: "/documents/:documentId/preview",
} as const;

export function getDocumentInputsRoute(documentId: string) {
  return `/documents/${encodeURIComponent(documentId)}/inputs`;
}

export function getDocumentPreviewRoute(documentId: string) {
  return `/documents/${encodeURIComponent(documentId)}/preview`;
}
