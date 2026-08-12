import { AlertCircle, FileCog, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { BomGenerationProgress, GenerateBomInput } from "../model/coverBom.types";

export function BomGenerationForm({ busy, progress, errors, onGenerate }: { busy: boolean; progress?: BomGenerationProgress | null; errors: Record<string, string>; onGenerate: (input: GenerateBomInput) => void }) {
  const [input, setInput] = useState<GenerateBomInput>({ lotSize: "", volume: "" });
  function submit(event: FormEvent) { event.preventDefault(); onGenerate(input); }
  return (
    <section className="mx-auto my-10 max-w-[720px] rounded-panel border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-3"><span className="rounded-control bg-accent-soft p-2 text-primary-dark"><FileCog className="size-5" /></span><div><h2 className="text-h2 font-semibold">Generate Cover + BOM</h2><p className="mt-1 text-small text-subdued">The backend will extract the MFC and Product Permission, then create the controlled multi-page DOCX.</p></div></div>
      <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={submit} noValidate>
        <GenerationField id="lot-size" label="Lot size" value={input.lotSize} error={errors.lotSize} helper="Use the lot size required for this production run." onChange={(value) => setInput((current) => ({ ...current, lotSize: value }))} />
        <GenerationField id="production-volume" label="Volume" value={input.volume} error={errors.volume} helper="Enter zero or a positive production volume." inputMode="decimal" onChange={(value) => setInput((current) => ({ ...current, volume: value }))} />
        {busy ? <div className="sm:col-span-2"><GenerationProgress progress={progress ?? null} /></div> : null}
        <div className="sm:col-span-2 flex justify-end"><button type="submit" className="preview-button-primary" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FileCog className="size-4" />}{busy ? "Generating Cover + BOM…" : "Generate Cover + BOM"}</button></div>
      </form>
    </section>
  );
}

function GenerationProgress({ progress }: { progress: BomGenerationProgress | null }) {
  const percent = clampPercent(progress?.percent);
  const step = progress?.step?.trim() || "Starting…";
  return (
    <div className="rounded-control bg-accent-soft/40 pt-4 pb-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-small font-semibold">
        <span className="min-w-0 truncate">{step}</span>
        <span className="ml-3 shrink-0 tabular-nums">{percent}%</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-accent-soft">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function clampPercent(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value as number)));
}

function GenerationField({ id, label, value, helper, error, inputMode, onChange }: { id: string; label: string; value: string; helper: string; error?: string; inputMode?: "decimal"; onChange: (value: string) => void }) {
  return <label className="space-y-2 text-small font-semibold" htmlFor={id}><span>{label}<span className="ml-1 text-danger">*</span></span><input id={id} value={value} inputMode={inputMode} className={`min-h-10 w-full rounded-control border bg-surface px-3 font-normal outline-none focus:ring-2 focus:ring-primary/20 ${error ? "border-danger" : "border-border focus:border-primary"}`} aria-invalid={Boolean(error)} onChange={(event) => onChange(event.target.value)} />{error ? <span className="flex items-start gap-1.5 font-normal text-danger-ink"><AlertCircle className="mt-0.5 size-3.5" />{error}</span> : <span className="block font-normal text-micro text-subdued">{helper}</span>}</label>;
}
