import axios from "axios";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  fetchCoverBomPreview,
  generateCoverBom,
  getCoverBomDocument,
  updateCoverBom,
} from "../api/coverBom.api";
import type {
  CoverBomDocumentData,
  CoverBomMode,
  CoverBomRequestError,
  EditableBomState,
  GenerateBomInput,
  UpdateBomPayload,
} from "../model/coverBom.types";
import type { PreviewDocument } from "../../format-preview/model/formatPreview.types";

interface ControllerState {
  mode: CoverBomMode;
  data: CoverBomDocumentData | null;
  preview: PreviewDocument | null;
  warnings: string[];
  draft: EditableBomState | null;
  errors: Record<string, string>;
  requestError: CoverBomRequestError | null;
  toast: string | null;
}

type Action =
  | { type: "mode"; mode: CoverBomMode }
  | { type: "loaded"; data: CoverBomDocumentData; preview: PreviewDocument }
  | { type: "not-generated"; data: CoverBomDocumentData | null }
  | { type: "failed"; mode: CoverBomMode; error: CoverBomRequestError }
  | { type: "warnings"; warnings: string[] }
  | { type: "edit"; draft: EditableBomState }
  | { type: "draft"; draft: EditableBomState }
  | { type: "discard-edit" }
  | { type: "validation"; errors: Record<string, string> }
  | { type: "saved"; data: CoverBomDocumentData; preview: PreviewDocument }
  | { type: "toast-clear" };

const initialState: ControllerState = {
  mode: "initial-loading",
  data: null,
  preview: null,
  warnings: [],
  draft: null,
  errors: {},
  requestError: null,
  toast: null,
};

function reducer(state: ControllerState, action: Action): ControllerState {
  switch (action.type) {
    case "mode": return { ...state, mode: action.mode, requestError: null };
    case "loaded": return { ...state, data: action.data, preview: action.preview, draft: null, errors: {}, requestError: null, mode: state.warnings.length ? "preview-ready-with-warnings" : "preview-ready" };
    case "not-generated": return { ...state, data: action.data, preview: null, mode: "not-generated", requestError: null };
    case "failed": return { ...state, mode: action.mode, requestError: action.error };
    case "warnings": return { ...state, warnings: action.warnings };
    case "edit": return { ...state, draft: action.draft, errors: {}, mode: "edit" };
    case "draft": return { ...state, draft: action.draft, errors: {}, mode: "edit-dirty" };
    case "discard-edit": return { ...state, draft: null, errors: {}, mode: state.warnings.length ? "preview-ready-with-warnings" : "preview-ready" };
    case "validation": return { ...state, errors: action.errors, mode: "validation-failure" };
    case "saved": return { ...state, data: action.data, preview: action.preview, draft: null, errors: {}, requestError: null, mode: "save-success", toast: "BOM corrections saved and the DOCX preview was regenerated." };
    case "toast-clear": return { ...state, toast: null, mode: state.mode === "save-success" ? (state.warnings.length ? "preview-ready-with-warnings" : "preview-ready") : state.mode };
  }
}

export function useCoverBomController(documentId: string, canAuthor: boolean, userIdentity: string | null) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const previewRef = useRef<PreviewDocument | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);

  const replacePreview = useCallback((next: PreviewDocument | null) => {
    if (previewRef.current && previewRef.current.objectUrl !== next?.objectUrl) URL.revokeObjectURL(previewRef.current.objectUrl);
    previewRef.current = next;
  }, []);

  const load = useCallback(async () => {
    if (!canAuthor || !documentId) return;
    const sequence = ++sequenceRef.current;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    dispatch({ type: "mode", mode: "initial-loading" });
    try {
      const data = await getCoverBomDocument(documentId, controller.signal);
      if (sequence !== sequenceRef.current) return;
      if (!data.preview_url || data.ingredients.length === 0) {
        replacePreview(null);
        dispatch({ type: "not-generated", data });
        return;
      }
      dispatch({ type: "mode", mode: "preview-loading" });
      const preview = await fetchCoverBomPreview(documentId, undefined, controller.signal);
      if (sequence !== sequenceRef.current) { URL.revokeObjectURL(preview.objectUrl); return; }
      replacePreview(preview);
      dispatch({ type: "loaded", data, preview });
    } catch (error) {
      if (axios.isCancel(error) || sequence !== sequenceRef.current) return;
      const normalized = error as CoverBomRequestError;
      if (normalized.kind === "not-generated") dispatch({ type: "not-generated", data: null });
      else dispatch({ type: "failed", mode: failureMode(normalized), error: normalized });
    } finally {
      if (sequence === sequenceRef.current) requestRef.current = null;
    }
  }, [canAuthor, documentId, replacePreview]);

  useEffect(() => { void load(); return () => { sequenceRef.current += 1; requestRef.current?.abort(); }; }, [load]);
  useEffect(() => () => replacePreview(null), [replacePreview]);

  const generate = useCallback(async (input: GenerateBomInput) => {
    if (!canAuthor || !documentId) return;
    const errors = validateGeneration(input);
    if (Object.keys(errors).length) { dispatch({ type: "validation", errors }); return; }
    dispatch({ type: "mode", mode: "generating" });
    try {
      const generated = await generateCoverBom(documentId, input);
      dispatch({ type: "warnings", warnings: generated.warnings });
      dispatch({ type: "mode", mode: "preview-loading" });
      const [data, preview] = await Promise.all([
        getCoverBomDocument(documentId),
        fetchCoverBomPreview(documentId, `${Date.now()}`),
      ]);
      replacePreview(preview);
      dispatch({ type: "loaded", data, preview });
    } catch (error) {
      const normalized = error as CoverBomRequestError;
      dispatch({ type: "failed", mode: failureMode(normalized, "generation-failure"), error: normalized });
    }
  }, [canAuthor, documentId, replacePreview]);

  const beginEdit = useCallback(() => {
    if (!canAuthor || !state.data) return;
    dispatch({ type: "edit", draft: toEditable(state.data) });
  }, [canAuthor, state.data]);

  const updateDraft = useCallback((draft: EditableBomState) => {
    if (!canAuthor) return;
    dispatch({ type: "draft", draft });
  }, [canAuthor]);

  const cancelEdit = useCallback(() => {
    dispatch({ type: "discard-edit" });
  }, []);

  const save = useCallback(async () => {
    if (!canAuthor || !userIdentity || !state.data || !state.draft || !state.preview) return;
    const errors = validateDraft(state.draft);
    if (Object.keys(errors).length) { dispatch({ type: "validation", errors }); return; }
    const payload = buildPatch(state.data, state.draft, userIdentity);
    if (!payload.batch_size && !payload.core && !payload.ingredient_edits?.length) {
      dispatch({ type: "discard-edit" });
      return;
    }
    dispatch({ type: "mode", mode: "saving" });
    try {
      await updateCoverBom(documentId, payload, state.preview.etag);
      dispatch({ type: "mode", mode: "regenerating" });
      const versionHint = `${Date.now()}`;
      const [data, preview] = await Promise.all([
        getCoverBomDocument(documentId),
        fetchCoverBomPreview(documentId, versionHint),
      ]);
      replacePreview(preview);
      downloadPreview(preview);
      dispatch({ type: "saved", data, preview });
    } catch (error) {
      const normalized = error as CoverBomRequestError;
      dispatch({ type: "failed", mode: failureMode(normalized), error: normalized });
    }
  }, [canAuthor, documentId, replacePreview, state.data, state.draft, state.preview, state.warnings.length, userIdentity]);

  const isBusy = ["initial-loading", "generating", "preview-loading", "saving", "regenerating"].includes(state.mode);
  const canProceed = Boolean(canAuthor && state.preview && !isBusy && !state.draft && !state.requestError);

  return useMemo(() => ({ state, load, generate, beginEdit, updateDraft, cancelEdit, save, isBusy, canProceed, clearToast: () => dispatch({ type: "toast-clear" }) }), [beginEdit, canProceed, cancelEdit, generate, isBusy, load, save, state, updateDraft]);
}

function toEditable(data: CoverBomDocumentData): EditableBomState {
  return {
    batchSize: String(data.batch_size ?? ""),
    batchType: data.batch_type ?? "",
    commercialMode: data.commercial_mode ?? "",
    ingredients: data.ingredients.map((ingredient, index) => ({
      rowKey: `${ingredient.material_code || "summary"}-${ingredient.sr_no}-${index}`,
      srNo: String(ingredient.sr_no),
      ingredientName: ingredient.ingredient_name,
      uom: ingredient.uom,
    })),
  };
}

function buildPatch(data: CoverBomDocumentData, draft: EditableBomState, user: string): UpdateBomPayload {
  const payload: UpdateBomPayload = { user };
  const batchSize = Number(draft.batchSize);
  if (batchSize !== data.batch_size) payload.batch_size = batchSize;
  const core: NonNullable<UpdateBomPayload["core"]> = {};
  if (draft.batchType !== data.batch_type) core.batch_type = draft.batchType;
  if (draft.commercialMode !== data.commercial_mode) core.commercial_mode = draft.commercialMode;
  if (Object.keys(core).length) payload.core = core;
  const edits = draft.ingredients.flatMap((row, index) => {
    const original = data.ingredients[index];
    if (!original || (row.ingredientName === original.ingredient_name && row.srNo === String(original.sr_no) && row.uom === original.uom)) return [];
    return [{ ingredient_name: row.ingredientName.trim(), sr_no: Number(row.srNo), uom: row.uom.trim() }];
  });
  if (edits.length) payload.ingredient_edits = edits;
  return payload;
}

function validateGeneration(input: GenerateBomInput) {
  const errors: Record<string, string> = {};
  if (!input.lotSize.trim()) errors.lotSize = "Enter the lot size used for BOM generation.";
  const volume = Number(input.volume);
  if (!input.volume.trim()) errors.volume = "Enter the production volume.";
  else if (!Number.isFinite(volume) || volume < 0) errors.volume = "Volume must be zero or a positive number.";
  return errors;
}

function validateDraft(draft: EditableBomState) {
  const errors: Record<string, string> = {};
  const batchSize = Number(draft.batchSize);
  if (!Number.isInteger(batchSize) || batchSize <= 0) errors.batchSize = "Batch size must be a positive whole number.";
  if (!draft.batchType) errors.batchType = "Select a batch type.";
  if (draft.batchType === "commercial" && !draft.commercialMode) errors.commercialMode = "Select a commercial mode.";
  draft.ingredients.forEach((row, index) => {
    if (!row.ingredientName.trim()) errors[`ingredient-${index}-name`] = "Ingredient name is required.";
    if (!row.uom.trim()) errors[`ingredient-${index}-uom`] = "UOM is required.";
    const srNo = Number(row.srNo);
    if (!Number.isInteger(srNo) || srNo < 0) errors[`ingredient-${index}-sr`] = "Use a whole number.";
  });
  return errors;
}

function failureMode(error: CoverBomRequestError, fallback: CoverBomMode = "preview-failure"): CoverBomMode {
  if (error.kind === "session-expired") return "session-timeout";
  if (error.kind === "version-conflict") return "version-conflict";
  if (error.kind === "validation") return "validation-failure";
  return fallback;
}

function downloadPreview(preview: PreviewDocument) {
  const anchor = document.createElement("a");
  anchor.href = preview.objectUrl;
  anchor.download = preview.filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
