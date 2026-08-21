import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useDocumentLayers } from "../hooks/useDocumentLayers";

interface LotSizeByLayerFieldProps {
  documentId: string;
  /** Current `lot_size` value - a comma-separated string, one entry per Cover BOM layer, in order. */
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

/** Splits a comma-separated `lot_size` string into one value per layer, padded/truncated to `layerCount`. */
function splitLotSize(value: string, layerCount: number): string[] {
  const parts = value.trim() ? value.split(",").map((part) => part.trim()) : [];
  return Array.from({ length: layerCount }, (_, index) => parts[index] ?? "");
}

/**
 * Renders one Lot Size input per Cover BOM layer for `dispensing_rm` -
 * the backend still expects a single comma-separated `lot_size` string (one
 * entry per layer, in Cover BOM order), so this only changes how the value
 * is collected on screen. See `stageUsesLayerLotSize`.
 */
export function LotSizeByLayerField({ documentId, value, disabled, onChange }: LotSizeByLayerFieldProps) {
  const documentLayers = useDocumentLayers(documentId);
  const { ensureLoaded } = documentLayers;

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  if (documentLayers.error) {
    return (
      <div
        role="status"
        className="mt-6 mb-4 flex items-start gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-small text-danger-ink"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <span className="flex-1">{documentLayers.error}</span>
        <button
          type="button"
          className="preview-button-secondary min-h-8 px-3"
          onClick={() => void documentLayers.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (documentLayers.isLoading) {
    return (
      <div className="mt-6 mb-4 flex min-h-9 items-center gap-3 text-small text-subdued">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading layers from the Cover BOM…
      </div>
    );
  }

  if (documentLayers.layers.length === 0) {
    return (
      <p className="mt-6 mb-4 text-micro italic text-subdued">
        No layers found in the Cover BOM for this document - generate the Cover BOM before entering lot size.
      </p>
    );
  }

  const values = splitLotSize(value, documentLayers.layers.length);

  function handleLayerChange(index: number, layerValue: string) {
    const next = [...values];
    next[index] = layerValue;
    onChange(next.join(","));
  }

  return (
    <div className="mt-6 mb-4 flex flex-wrap gap-4">
      {documentLayers.layers.map((layer, index) => {
        const inputId = `lot-size-layer-${index}`;
        return (
          <div key={`${layer}-${index}`} className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-small font-semibold text-text">
              {layer} - Lot Size
            </label>
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              value={values[index] ?? ""}
              disabled={disabled}
              placeholder="Enter lot size"
              className="h-9 w-48 rounded-control border border-border bg-surface px-3 text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(event) => handleLayerChange(index, event.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
