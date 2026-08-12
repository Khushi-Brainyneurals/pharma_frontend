import type { KeyboardEvent } from "react";

interface KeyboardNavOption {
  id: string;
  available: boolean;
}

/** Arrow-key navigation for a `role="radiogroup"` of option cards, skipping unavailable options. */
export function handleOptionGroupKeyDown<TOption extends KeyboardNavOption>(
  event: KeyboardEvent<HTMLDivElement>,
  options: TOption[],
  selectedId: string | null,
  onSelect: (optionId: string) => void,
) {
  if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
    return;
  }

  const availableOptions = options.filter((option) => option.available);
  if (!availableOptions.length) {
    return;
  }

  event.preventDefault();

  const currentIndex = Math.max(
    0,
    availableOptions.findIndex((option) => option.id === selectedId),
  );
  const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
  const nextIndex = (currentIndex + direction + availableOptions.length) % availableOptions.length;
  onSelect(availableOptions[nextIndex].id);
}
