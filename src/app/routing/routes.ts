export const ROUTES = {
  login: "/login",
  newDocument: "/new",
  statusBoard: "/session",
  employeeManagement: "/employee-management",
  documentInputs: "/documents/:documentId/inputs",
  documentPreview: "/documents/:documentId/preview",
  documentCoverBom: "/documents/:documentId/cover-bom",
  documentSelectStages: "/documents/:documentId/stages",
} as const;

export const MASTER_DATA_ROUTES = {
  hub: "/master-data",
  company: "/master-data/company",
  equipmentInstrument: "/master-data/equipment-instrument",
  types: "/master-data/types",
  stageDocuments: "/master-data/sets/:productType/:docType/stage-documents",
  batchDocuments: "/master-data/sets/:productType/:docType/batch-documents",
  preview: "/master-data/sets/:productType/:docType/preview",
} as const;

export interface MasterDataRouteScope {
  productType: string;
  docType: string;
}

function masterDataSetRoute({ productType, docType }: MasterDataRouteScope, segment: string) {
  return `/master-data/sets/${encodeURIComponent(productType)}/${encodeURIComponent(docType)}/${segment}`;
}

export function getStageDocumentsRoute(scope: MasterDataRouteScope) {
  return masterDataSetRoute(scope, "stage-documents");
}

export function getBatchDocumentsRoute(scope: MasterDataRouteScope) {
  return masterDataSetRoute(scope, "batch-documents");
}

export function getMasterDataPreviewRoute(scope: MasterDataRouteScope) {
  return masterDataSetRoute(scope, "preview");
}

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
