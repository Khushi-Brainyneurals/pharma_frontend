import { Check, CheckCircle2, Circle } from "lucide-react";
import type { DocumentStep } from "../model/documentSelector.types";

interface DocumentStepperProps {
  steps: DocumentStep[];
  activeStepId: string;
}

export function DocumentStepper({ steps, activeStepId }: DocumentStepperProps) {
  const activeIndex = steps.findIndex((step) => step.id === activeStepId);

  return (
    <div aria-label="Document creation progress">
      <ol className="hidden items-center gap-2 md:flex">
        {steps.map((step, index) => {
          const isActive = step.id === activeStepId;
          const isComplete = index < activeIndex;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-small font-semibold ${
                  isActive || isComplete
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-muted text-subdued"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete ? (
                  <Check className="size-3.5" strokeWidth="3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={`truncate text-micro font-medium ${
                  isActive ? "text-primary-dark" : "text-subdued"
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 ? (
                <span className="h-px min-w-3 flex-1 bg-border" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3 rounded-control border border-border bg-muted px-3 py-2 md:hidden">
        <Circle className="size-4 fill-primary text-primary" aria-hidden="true" />
        <span className="text-small font-semibold text-text">
          Step {activeIndex >= 0 ? activeIndex + 1 : 1} of {steps.length}
        </span>
        <span className="text-small text-subdued">
          {steps[activeIndex]?.label ?? steps[0]?.label ?? "Step"}
        </span>
      </div>
    </div>
  );
}
