import { useCallback, useRef, useState } from "react";
import { getCoverBomDocument } from "../../cover-bom/api/coverBom.api";
import type { CoverBomRequestError } from "../../cover-bom/model/coverBom.types";

function isCoverBomRequestError(value: unknown): value is CoverBomRequestError {
  return Boolean(value && typeof value === "object" && "kind" in value && "message" in value);
}

export interface DocumentLayersController {
  layers: string[];
  isLoading: boolean;
  error: string | null;
  /** Loads the layers once and caches them; safe to call repeatedly. */
  ensureLoaded: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Fetches this document's Cover BOM layers - `GET /api/bmr/documents/{id}`,
 * same endpoint the Cover BOM step itself uses - and caches them for this
 * hook instance. Used to build one lot-size input per layer for
 * `dispensing_rm`; see `LotSizeByLayerField`.
 */
export function useDocumentLayers(documentId: string): DocumentLayersController {
  const [layers, setLayers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedForRef = useRef<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setIsLoading(true);
    setError(null);

    const promise = (async () => {
      try {
        const doc = await getCoverBomDocument(documentId);
        setLayers(doc.layers);
        loadedForRef.current = documentId;
      } catch (err) {
        const message = isCoverBomRequestError(err)
          ? err.message
          : "Unable to load layers from the Cover BOM for this document.";
        setError(message);
        loadedForRef.current = null;
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = promise;
    return promise;
  }, [documentId]);

  const ensureLoaded = useCallback(async () => {
    if (loadedForRef.current === documentId) {
      return;
    }
    await load();
  }, [documentId, load]);

  return { layers, isLoading, error, ensureLoaded, reload: load };
}
