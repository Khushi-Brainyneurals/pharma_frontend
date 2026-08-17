interface CppFieldsSectionProps {
  /** CPP names for the selected equipment + processing step, straight from the master data. */
  cppNames: string[];
  values: Record<string, string>;
  disabled?: boolean;
  onChange: (name: string, value: string) => void;
}

/**
 * Renders one text input per critical process parameter name.
 *
 * CPP names always come from the selected equipment master's `steps[].cpp` -
 * never hardcoded. When a step has no CPP entries, this renders nothing so
 * no unnecessary input fields are shown.
 */
export function CppFieldsSection({ cppNames, values, disabled = false, onChange }: CppFieldsSectionProps) {
  if (cppNames.length === 0) {
    return null;
  }

  return (
    <div>
      {cppNames.map((name, index) => (
        <div
          key={name}
          className={`flex flex-wrap items-center gap-4 py-3 ${index > 0 ? "border-t border-border" : ""}`}
        >
          <label className="min-w-0 flex-1 text-small text-text">{name}</label>
          <input
            type="text"
            value={values[name] ?? ""}
            disabled={disabled}
            placeholder="Enter value"
            aria-label={name}
            className="h-9 w-full max-w-[210px] rounded-control border border-border bg-surface px-2.5 font-mono text-small text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(e) => onChange(name, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
