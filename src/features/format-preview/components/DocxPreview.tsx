import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PreviewDocument } from "../model/formatPreview.types";

interface DocxPreviewProps {
  document: PreviewDocument;
  onReadyChange: (isReady: boolean) => void;
}

export function DocxPreview({ document, onReadyChange }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    container.replaceChildren();
    setIsReady(false);
    setError(null);
    onReadyChange(false);

    void import("docx-preview")
      .then(({ renderAsync }) => renderAsync(document.blob, container, undefined, {
        className: "pharmadoc-word",
        inWrapper: true,
        breakPages: true,
        ignoreWidth: false,
        ignoreHeight: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        useBase64URL: true,
      }))
      .then(() => {
        if (active) {
          setIsReady(true);
          onReadyChange(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setError("The returned Word document is corrupted or could not be rendered.");
        onReadyChange(false);
      });

    return () => {
      active = false;
      container.replaceChildren();
    };
  }, [document.blob, document.documentKey, onReadyChange]);

  return (
    <div className="relative min-h-[620px] overflow-auto bg-muted p-3 sm:p-6" aria-label="Rendered Word document">
      <div ref={containerRef} className="docx-preview-host mx-auto min-w-fit" />
      {!isReady && !error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85" data-docx-loading role="status" aria-live="polite">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <span className="text-small font-medium text-subdued">Rendering the returned Word document…</span>
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center" role="alert">
          <AlertTriangle className="size-10 text-danger" aria-hidden="true" />
          <h2 className="text-h2 font-semibold text-text">Document preview unavailable</h2>
          <p className="max-w-lg text-small text-subdued">{error}</p>
          <a href={document.objectUrl} download={document.filename} className="preview-button-secondary">Download returned DOCX</a>
        </div>
      ) : null}
    </div>
  );
}
