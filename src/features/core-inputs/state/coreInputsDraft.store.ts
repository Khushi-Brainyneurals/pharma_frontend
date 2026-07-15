import { create } from "zustand";
import type { CoreInputsFormState } from "../pages/CoreInputsPage";

interface CoreInputsDraftState {
  drafts: Record<string, CoreInputsFormState>;
  setDraft: (documentId: string, draft: CoreInputsFormState) => void;
  clearDraft: (documentId: string) => void;
}

export const useCoreInputsDraftStore = create<CoreInputsDraftState>((set) => ({
  drafts: {},
  setDraft: (documentId, draft) => {
    if (!documentId) return;
    set((state) => ({
      drafts: {
        ...state.drafts,
        [documentId]: draft,
      },
    }));
  },
  clearDraft: (documentId) => {
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[documentId];
      return { drafts };
    });
  },
}));
