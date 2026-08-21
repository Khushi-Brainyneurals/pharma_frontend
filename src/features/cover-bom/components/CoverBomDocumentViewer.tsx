import {
  AlertTriangle,
  ChevronsUpDown,
  Expand,
  Loader2,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PreviewDocument } from "../../format-preview/model/formatPreview.types";

const SEARCH_HIGHLIGHT_CLASS = "bom-search-highlight";
const SEARCH_DEBOUNCE_MS = 400;

export function CoverBomDocumentViewer({ document }: { document: PreviewDocument }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let active = true;
    host.replaceChildren();
    setReady(false);
    setError(null);
    setPageCount(0);
    void import("docx-preview")
      .then(({ renderAsync }) => renderAsync(document.blob, host, undefined, {
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
        if (!active) return;
        setPageCount(host.querySelectorAll("section.pharmadoc-word").length);
        setReady(true);
      })
      .catch(() => { if (active) setError("The generated DOCX could not be rendered. You can still download the original file."); });
    return () => { active = false; host.replaceChildren(); };
  }, [document.blob, document.documentKey]);

  // Debounce the search term so highlighting doesn't run on every keystroke.
  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery("");
      return;
    }
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Re-highlight whenever the debounced term changes or a (new) document finishes rendering.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ready) return;
    clearSearchHighlights(host);
    const term = debouncedQuery.trim();
    if (!term) {
      setMatchCount(null);
      return;
    }
    const count = applySearchHighlights(host, term);
    setMatchCount(count);
    if (count > 0) {
      host.querySelector(`mark.${SEARCH_HIGHLIGHT_CLASS}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [debouncedQuery, ready]);

  function fitWidth() {
    const viewportWidth = viewerRef.current?.clientWidth ?? 0;
    const pageWidth = hostRef.current?.querySelector<HTMLElement>("section.pharmadoc-word")?.offsetWidth ?? 816;
    if (viewportWidth > 0 && pageWidth > 0) setZoom(Math.max(0.5, Math.min(1.5, (viewportWidth - 48) / pageWidth)));
  }

  function findText(event: FormEvent) {
    event.preventDefault();
    // Explicit submit (Enter / search button) applies the term immediately, bypassing the debounce.
    setDebouncedQuery(query);
  }

  const trimmedTerm = debouncedQuery.trim();
  const searchMessage = trimmedTerm && matchCount !== null
    ? matchCount > 0
      ? `${matchCount} match${matchCount === 1 ? "" : "es"} for “${trimmedTerm}”.`
      : `No matches for “${trimmedTerm}”.`
    : null;

  return (
    <section ref={viewerRef} className="overflow-hidden rounded-panel border border-border bg-surface shadow-sm" aria-label="Read-only Cover and BOM Word preview">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <form className="mr-auto flex min-w-[220px] max-w-sm flex-1 items-center" onSubmit={findText} role="search">
          <label className="sr-only" htmlFor="bom-document-search">Search document</label>
          <input id="bom-document-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search document" className="min-h-9 min-w-0 flex-1 rounded-l-control border border-border bg-surface px-3 text-small outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <button type="submit" className="inline-flex min-h-9 items-center rounded-r-control border border-l-0 border-border px-3 text-subdued hover:bg-muted" aria-label="Search"><Search className="size-4" /></button>
        </form>
        {/* <span className="text-micro text-subdued" aria-live="polite">{pageCount ? `${pageCount} pages` : "Counting pages…"}</span> */}
        <button type="button" className="viewer-tool" onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))} aria-label="Zoom out"><Minus className="size-4" /></button>
        <span className="w-12 text-center text-micro font-medium tabular-nums text-text">{Math.round(zoom * 100)}%</span>
        <button type="button" className="viewer-tool" onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))} aria-label="Zoom in"><Plus className="size-4" /></button>
        <button type="button" className="viewer-tool gap-1.5 px-2" onClick={fitWidth} title="Fit page width"><ChevronsUpDown className="size-4 rotate-90" /><span className="hidden sm:inline">Fit width</span></button>
        <button type="button" className="viewer-tool" onClick={() => void viewerRef.current?.requestFullscreen?.()} aria-label="Open fullscreen"><Expand className="size-4" /></button>
      </div>
      {searchMessage ? <p className="border-b border-border bg-muted px-4 py-1.5 text-micro text-subdued" aria-live="polite">{searchMessage}</p> : null}
      <div className="relative h-[calc(100vh-310px)] min-h-[680px] overflow-auto bg-muted p-4 sm:p-7">
        <div ref={hostRef} className="docx-preview-host cover-bom-docx-host mx-auto min-w-fit" style={{ zoom }} />
        {!ready && !error ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90" role="status"><Loader2 className="size-8 animate-spin text-primary" /><p className="text-small font-medium text-subdued">Rendering the multi-page Word document…</p></div> : null}
        {error ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center" role="alert"><AlertTriangle className="size-10 text-danger" /><h2 className="text-h2 font-semibold">Preview unavailable</h2><p className="max-w-lg text-small text-subdued">{error}</p><a href={document.objectUrl} download={document.filename} className="preview-button-secondary">Download DOCX</a></div> : null}
      </div>
    </section>
  );
}

/* ── Search highlighting: safe DOM text-node manipulation, no HTML string replacement ── */

function clearSearchHighlights(host: HTMLElement) {
  const marks = host.querySelectorAll(`mark.${SEARCH_HIGHLIGHT_CLASS}`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(window.document.createTextNode(mark.textContent ?? ""), mark);
    parent.normalize();
  });
}

function applySearchHighlights(host: HTMLElement, term: string): number {
  const pattern = new RegExp(escapeForRegExp(term), "gi");
  const walker = window.document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parentTag = node.parentElement?.tagName;
      if (parentTag === "SCRIPT" || parentTag === "STYLE") return NodeFilter.FILTER_REJECT;
      return node.textContent ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  // Collect text nodes first: mutating nodes while the walker is traversing would break it.
  const textNodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }

  let matchCount = 0;
  for (const textNode of textNodes) {
    const text = textNode.textContent ?? "";
    pattern.lastIndex = 0;
    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;

    const fragment = window.document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      if (match.index > lastIndex) fragment.append(window.document.createTextNode(text.slice(lastIndex, match.index)));
      const mark = window.document.createElement("mark");
      mark.className = `${SEARCH_HIGHLIGHT_CLASS} rounded-sm bg-accent-soft text-primary-dark`;
      mark.textContent = match[0];
      fragment.append(mark);
      matchCount += 1;
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) fragment.append(window.document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  return matchCount;
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
