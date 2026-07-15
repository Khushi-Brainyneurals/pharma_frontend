export const ROUTES = {
  login: "/login",
  newDocument: "/new",
  statusBoard: "/session",
  documentInputs: "/documents/:documentId/inputs",
  documentPreview: "/documents/:documentId/preview",
  documentCoverBom: "/documents/:documentId/cover-bom",
  documentSelectStages: "/documents/:documentId/stages",
} as const;

export function getDocumentInputsRoute(documentId: string) {
  return `/documents/${encodeURIComponent(documentId)}/inputs`;
}

export function getDocumentPreviewRoute(documentId: string) {
  return `/documents/${encodeURIComponent(documentId)}/preview`;
}

export function getCoverBomRoute(documentId: string) {
  return `/documents/${encodeURIComponent(documentId)}/cover-bom`;
}

export function getSelectStagesRoute(documentId: string) {
  return `/documents/${encodeURIComponent(documentId)}/stages`;
}
