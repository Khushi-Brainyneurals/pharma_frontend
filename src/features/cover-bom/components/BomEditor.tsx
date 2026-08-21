// import { AlertCircle, Info } from "lucide-react";
// import type { CoverBomDocumentData, EditableBomState } from "../model/coverBom.types";

// interface BomEditorProps { data: CoverBomDocumentData; draft: EditableBomState; errors: Record<string, string>; disabled: boolean; onChange: (draft: EditableBomState) => void }

// export function BomEditor({ data, draft, errors, disabled, onChange }: BomEditorProps) {
//   function updateHeader(field: "batchSize" | "batchType" | "commercialMode", value: string) { onChange({ ...draft, [field]: value, ...(field === "batchType" && value !== "commercial" ? { commercialMode: "" } : {}) }); }
//   function updateRow(index: number, field: "srNo" | "ingredientName" | "uom", value: string) { onChange({ ...draft, ingredients: draft.ingredients.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row) }); }
//   return (
//     <section className="space-y-4" aria-label="Editable Cover and BOM data">
//       <div className="rounded-card border border-primary/20 bg-accent-soft px-4 py-3 text-small text-primary-dark"><p className="flex items-start gap-2"><Info className="mt-0.5 size-4 shrink-0" />Only supported fields are editable. Quantities, material codes, layers, and production parts remain backend-controlled.</p></div>
//       {/* <div className="grid gap-4 rounded-panel border border-border bg-surface p-5 shadow-sm sm:grid-cols-3">
//         <EditField label="Batch size" value={draft.batchSize} error={errors.batchSize} disabled={disabled} onChange={(value) => updateHeader("batchSize", value)} />
//         <label className="space-y-2 text-small font-semibold">Batch type<select value={draft.batchType} disabled={disabled} className="bom-input" onChange={(event) => updateHeader("batchType", event.target.value)}><option value="">Select…</option><option value="exhibit">Exhibit</option><option value="scale_up">Scale up</option><option value="commercial">Commercial</option></select>{errors.batchType ? <FieldError message={errors.batchType} /> : null}</label>
//         <label className="space-y-2 text-small font-semibold">Commercial mode<select value={draft.commercialMode} disabled={disabled || draft.batchType !== "commercial"} className="bom-input" onChange={(event) => updateHeader("commercialMode", event.target.value)}><option value="">Not applicable</option><option value="revision">Revision</option><option value="validation">Validation</option></select>{errors.commercialMode ? <FieldError message={errors.commercialMode} /> : null}</label>
//       </div> */}
//       <div className="overflow-hidden rounded-panel border border-border bg-surface shadow-sm">
//         <div className="border-b border-border px-4 py-3"><h2 className="text-h2 font-semibold">Master Formulation Sheet (Bills of Materials)</h2><p className="mt-1 text-micro text-subdued">{data.ingredients.length} extracted rows. Only changed rows are sent when you save.</p></div>
//         <div className="max-h-[calc(100vh-370px)] min-h-[520px] overflow-auto">
//           <table className="w-full min-w-[1180px] border-collapse text-small">
//             <thead className="sticky top-0 z-[1] bg-muted text-left text-micro uppercase tracking-overline text-subdued"><tr>{["Sr. no.", "Material code", "Ingredient name", "UOM", "Layer", "Production part", "MFC batch qty", "Required production qty"].map((label) => <th key={label} className="border-b border-border px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
//             <tbody>{data.ingredients.map((ingredient, index) => { const row = draft.ingredients[index]; return <tr key={row.rowKey} className="border-b border-border/80 align-top hover:bg-muted/40"><td className="w-20 px-3 py-2"><input value={row.srNo} inputMode="numeric" disabled={disabled} className="bom-table-input w-12" aria-label={`Serial number row ${index + 1}`} onChange={(event) => updateRow(index, "srNo", event.target.value)} />{errors[`ingredient-${index}-sr`] ? <FieldError message={errors[`ingredient-${index}-sr`]} /> : null}</td><td className="px-3 py-3 font-mono text-mono-sm text-subdued">{ingredient.material_code || "-"}</td><td className="min-w-[280px] p-2"><input value={row.ingredientName} disabled={disabled} className="bom-table-input w-full" aria-label={`Ingredient name row ${index + 1}`} onChange={(event) => updateRow(index, "ingredientName", event.target.value)} />{errors[`ingredient-${index}-name`] ? <FieldError message={errors[`ingredient-${index}-name`]} /> : null}</td><td className="w-20 p-2"><input value={row.uom} disabled={disabled} className="bom-table-input w-16" aria-label={`UOM row ${index + 1}`} onChange={(event) => updateRow(index, "uom", event.target.value)} />{errors[`ingredient-${index}-uom`] ? <FieldError message={errors[`ingredient-${index}-uom`]} /> : null}</td><td className="px-3 py-3 text-subdued">{ingredient.layer || "-"}</td><td className="min-w-38 px-3 py-3 text-subdued">{ingredient.part || "-"}</td><td className="px-3 py-3 text-left tabular-nums">{formatQuantity(ingredient.qty_per_mfc_batch)}</td><td className="px-3 py-3 text-left tabular-nums">{formatQuantity(ingredient.qty_required_production)}</td></tr>; })}</tbody>
//           </table>
//         </div>
//       </div>
//     </section>
//   );
// }

// function EditField({ label, value, error, disabled, onChange }: { label: string; value: string; error?: string; disabled: boolean; onChange: (value: string) => void }) { return <label className="space-y-2 text-small font-semibold">{label}<input value={value} disabled={disabled} inputMode="numeric" className="bom-input" onChange={(event) => onChange(event.target.value)} />{error ? <FieldError message={error} /> : null}</label>; }
// function FieldError({ message }: { message: string }) { return <span className="mt-1 flex items-start gap-1 text-micro font-normal text-danger-ink"><AlertCircle className="mt-0.5 size-3 shrink-0" />{message}</span>; }
// function formatQuantity(value: number) { return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "-"; }

import { AlertCircle, Info } from "lucide-react";
import type { CoverBomDocumentData, EditableBomState } from "../model/coverBom.types";

interface BomEditorProps {
  data: CoverBomDocumentData;
  draft: EditableBomState;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (draft: EditableBomState) => void;
}

export function BomEditor({ data, draft, errors, disabled, onChange }: BomEditorProps) {
  function updateHeader(field: "batchSize" | "batchType" | "commercialMode", value: string) {
    onChange({
      ...draft,
      [field]: value,
      ...(field === "batchType" && value !== "commercial" ? { commercialMode: "" } : {}),
    });
  }

  function updateRow(
    index: number,
    field: "srNo" | "ingredientName" | "uom" | "materialCode" | "part" | "qtyPerMfcBatch" | "qtyRequiredProduction",
    value: string
  ) {
    onChange({
      ...draft,
      ingredients: draft.ingredients.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      ),
    });
  }

  /* ── Group ingredients by Layer → Part, preserving original API order ── */
  type IngredientItem = { ingredient: (typeof data.ingredients)[number]; originalIndex: number };
  type PartGroup = { key: string; label: string; items: IngredientItem[] };
  type LayerGroup = { key: string; label: string; parts: PartGroup[] };

  const layerGroups: LayerGroup[] = [];
  data.ingredients.forEach((ingredient, index) => {
    const layerLabel = ingredient.layer?.trim() || "Unspecified Layer";
    const partLabel = ingredient.part?.trim() || "Unspecified Part";

    let layerGroup = layerGroups.find((group) => group.key === layerLabel);
    if (!layerGroup) {
      layerGroup = { key: layerLabel, label: layerLabel, parts: [] };
      layerGroups.push(layerGroup);
    }

    let partGroup = layerGroup.parts.find((group) => group.key === partLabel);
    if (!partGroup) {
      partGroup = { key: partLabel, label: partLabel, items: [] };
      layerGroup.parts.push(partGroup);
    }

    partGroup.items.push({ ingredient, originalIndex: index });
  });

  // Skip the nested headings when there's really nothing to group (single layer, single part).
  const isGrouped = !(layerGroups.length === 1 && layerGroups[0].parts.length === 1);
  const totalParts = layerGroups.reduce((sum, group) => sum + group.parts.length, 0);

  /* ── Column definitions (no Layer column) ── */
  const columns = [
    "Sr. no.",
    "Material code",
    "Ingredient name",
    "MFC batch qty",
    "Required production qty",
    "UOM",
  ] as const;

  /* ── Row renderer ── */
  function renderIngredientRow({ originalIndex: index }: IngredientItem) {
    const row = draft.ingredients[index];
    return (
      <tr key={row.rowKey} className="border-b border-border/80 align-top hover:bg-muted/40">
        <td className="w-20 px-3 py-2">
          <input
            value={row.srNo}
            inputMode="numeric"
            disabled={disabled}
            className="bom-table-input w-12"
            aria-label={`Serial number row ${index + 1}`}
            onChange={(e) => updateRow(index, "srNo", e.target.value)}
          />
          {errors[`ingredient-${index}-sr`] && <FieldError message={errors[`ingredient-${index}-sr`]} />}
        </td>
        <td className="min-w-24 p-2">
          <input
            value={row.materialCode}
            disabled={disabled}
            className="bom-table-input w-full font-mono text-mono-sm"
            aria-label={`Material code row ${index + 1}`}
            onChange={(e) => updateRow(index, "materialCode", e.target.value)}
          />
          {errors[`ingredient-${index}-material`] && <FieldError message={errors[`ingredient-${index}-material`]} />}
        </td>
        <td className="min-w-[280px] p-2">
          <input
            value={row.ingredientName}
            disabled={disabled}
            className="bom-table-input w-full"
            aria-label={`Ingredient name row ${index + 1}`}
            onChange={(e) => updateRow(index, "ingredientName", e.target.value)}
          />
          {errors[`ingredient-${index}-name`] && <FieldError message={errors[`ingredient-${index}-name`]} />}
        </td>
        <td className="min-w-28 p-2">
          <input
            value={row.qtyPerMfcBatch}
            inputMode="decimal"
            disabled={disabled}
            className="bom-table-input w-full text-left tabular-nums"
            aria-label={`MFC batch quantity row ${index + 1}`}
            onChange={(e) => updateRow(index, "qtyPerMfcBatch", e.target.value)}
          />
          {errors[`ingredient-${index}-qtymfc`] && <FieldError message={errors[`ingredient-${index}-qtymfc`]} />}
        </td>
        <td className="min-w-28 p-2">
          <input
            value={row.qtyRequiredProduction}
            inputMode="decimal"
            disabled={disabled}
            className="bom-table-input w-full text-left tabular-nums"
            aria-label={`Required production quantity row ${index + 1}`}
            onChange={(e) => updateRow(index, "qtyRequiredProduction", e.target.value)}
          />
          {errors[`ingredient-${index}-qtyprod`] && <FieldError message={errors[`ingredient-${index}-qtyprod`]} />}
        </td>
        <td className="w-20 p-2">
          <input
            value={row.uom}
            disabled={disabled}
            className="bom-table-input w-24"
            aria-label={`UOM row ${index + 1}`}
            onChange={(e) => updateRow(index, "uom", e.target.value)}
          />
          {errors[`ingredient-${index}-uom`] && <FieldError message={errors[`ingredient-${index}-uom`]} />}
        </td>
      </tr>
    );
  }

  /* ── Table header renderer ── */
  function renderTableHead(sticky: boolean) {
    return (
      <thead
        className={`text-left text-micro uppercase tracking-overline text-subdued ${
          sticky ? "sticky top-0 z-[1] bg-muted" : "bg-muted/50"
        }`}
      >
        <tr>
          {columns.map((label) => (
            <th key={label} className="border-b border-border px-3 py-3 font-semibold">
              {label}
            </th>
          ))}
        </tr>
      </thead>
    );
  }

  return (
    <section className="space-y-4" aria-label="Editable Cover and BOM data">
      {/* Info banner */}
      {/* <div className="rounded-card border border-primary/20 bg-accent-soft px-4 py-3 text-small text-primary-dark">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0" />
          All ingredient fields are editable. Rows stay grouped by Layer as extracted; only changed rows are sent when you save.
        </p>
      </div> */}

      {/* Table panel */}
      <div className="overflow-hidden rounded-panel border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-4">
          <h2 className="text-h2 font-semibold">Master Formulation Sheet (Bills of Materials)</h2>
          <p className="mt-1 text-micro text-subdued">
            {data.ingredients.length} extracted rows
            {isGrouped
              ? ` across ${layerGroups.length} layer${layerGroups.length === 1 ? "" : "s"} and ${totalParts} part${totalParts === 1 ? "" : "s"}. Only changed rows are sent when you save.`
              : ". Only changed rows are sent when you save."}
          </p>
        </div>

        <div className="max-h-[calc(100vh-370px)] min-h-[520px] overflow-auto">
          {isGrouped ? (
            /* ── Grouped: Layer → Part, with separate tables per part ── */
            <div>
              {layerGroups.map((layerGroup, layerIdx) => {
                const layerRowCount = layerGroup.parts.reduce((sum, part) => sum + part.items.length, 0);
                return (
                  <div key={layerGroup.key}>
                    {/* Layer group heading */}
                    <div className="sticky top-0 z-[2] border-b border-border bg-accent-soft px-4 py-3 backdrop-blur-sm">
                      <h2 className="text-small font-bold uppercase tracking-overline text-primary-dark">
                        {layerGroup.label}
                        <span className="ml-2 text-micro font-normal normal-case tracking-normal">
                          ({layerRowCount} {layerRowCount === 1 ? "row" : "rows"})
                        </span>
                      </h2>
                    </div>

                    {layerGroup.parts.map((partGroup, partIdx) => (
                      <div key={partGroup.key}>
                        {/* Part group heading */}
                        <div className="border-b border-border bg-muted/30 px-4 py-2.5 flex items-center justify-center">
                          <h3 className="text-micro font-bold uppercase tracking-overline text-text/90">
                            {partGroup.label}
                            <span className="ml-2 font-normal normal-case tracking-normal">
                              ({partGroup.items.length} {partGroup.items.length === 1 ? "row" : "rows"})
                            </span>
                          </h3>
                        </div>

                        {/* Part table */}
                        <table className="w-full min-w-[1080px] border-collapse text-small">
                          {renderTableHead(false)}
                          <tbody>{partGroup.items.map(renderIngredientRow)}</tbody>
                        </table>

                        {/* Visual separator between part groups */}
                        {partIdx < layerGroup.parts.length - 1 && <div className="h-1 bg-border/10" />}
                      </div>
                    ))}

                    {/* Visual separator between layer groups */}
                    {layerIdx < layerGroups.length - 1 && <div className="h-2 bg-border/20" />}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Ungrouped (single layer, single part): one table with sticky header ── */
            <table className="w-full min-w-[1180px] border-collapse text-small">
              {renderTableHead(true)}
              <tbody>
                {data.ingredients.map((ingredient, index) =>
                  renderIngredientRow({ ingredient, originalIndex: index })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Sub-components ── */

function EditField({
  label,
  value,
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-small font-semibold">
      {label}
      <input
        value={value}
        disabled={disabled}
        inputMode="numeric"
        className="bom-input"
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <FieldError message={error} />}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <span className="mt-1 flex items-start gap-1 text-micro font-normal text-danger-ink">
      <AlertCircle className="mt-0.5 size-3 shrink-0" />
      {message}
    </span>
  );
}