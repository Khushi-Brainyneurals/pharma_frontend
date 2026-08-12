import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeMasterDataError } from "../api/masterData.errors";
import type { DocumentPreview } from "../api/masterData.types";

export interface PreviewTarget {
  key: string;
  title: string;
  load: (signal?: AbortSignal) => Promise<DocumentPreview>;
}

export interface DocumentPreviewController {
  target: PreviewTarget | null;
  document: DocumentPreview | null;
  isLoading: boolean;
  error: string | null;
  open: (target: PreviewTarget) => void;
  close: () => void;
}

/** Owns the object URL lifecycle so a preview never leaks between documents. */
export function useDocumentPreview(): DocumentPreviewController {
  const [target, setTarget] = useState<PreviewTarget | null>(null);
  const [document, setDocument] = useState<DocumentPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  const release = useCallback(() => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  }, []);

  useEffect(() => release, [release]);

  useEffect(() => {
    if (!target) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setError(null);
    release();
    setDocument(null);

    target
      .load(controller.signal)
      .then((preview) => {
        if (!active) {
          URL.revokeObjectURL(preview.objectUrl);
          return;
        }
        objectUrl.current = preview.objectUrl;
        setDocument(preview);
      })
      .catch(async (requestError: unknown) => {
        if (!active) {
          return;
        }
        const normalized = await normalizeMasterDataError(requestError, "Unable to open this document.");
        setError(normalized.message);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [release, target]);

  return {
    target,
    document,
    isLoading,
    error,
    open: useCallback((next: PreviewTarget) => setTarget(next), []),
    close: useCallback(() => {
      release();
      setTarget(null);
      setDocument(null);
      setError(null);
    }, [release]),
  };
}
