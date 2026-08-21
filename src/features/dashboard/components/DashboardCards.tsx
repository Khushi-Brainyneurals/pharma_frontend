import type { DashboardCard } from "../api/dashboard.types";
import { getCardVisual } from "../model/dashboard.presentation";

interface DashboardCardsProps {
  cards: DashboardCard[];
  selectedBucket: string | null;
  isRefreshing: boolean;
  onSelect: (key: string) => void;
}

/** The status summary row - entirely driven by `cards`, never a hardcoded bucket list. */
export function DashboardCards({ cards, selectedBucket, isRefreshing, onSelect }: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {cards.map((card) => {
        const isActive = card.key === selectedBucket;
        const { Icon, chipClasses } = getCardVisual(card);

        return (
          <button
            key={card.key}
            type="button"
            disabled={isRefreshing}
            aria-pressed={isActive}
            onClick={() => onSelect(card.key)}
            className={`group relative flex flex-col rounded-card border p-4 text-left shadow-sm transition-all duration-150 hover:scale-[1.01] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:p-5 ${
              isActive
                ? "border-primary/40 bg-accent-soft ring-1 ring-primary/20"
                : "border-border bg-surface hover:border-primary/25 hover:bg-muted/60"
            }`}
          >
            {/* {isActive ? (
              <span className="absolute right-3 top-3 size-2 rounded-full bg-primary" aria-hidden="true" />
            ) : null} */}

            <div className="grid grid-cols-[1fr_auto] items-start gap-x-4">
              {/* First column */}
              <div>
                <span
                  className={`inline-flex size-10 shrink-0 items-center justify-center rounded-control ${chipClasses}`}
                  aria-hidden="true"
                >
                  <Icon
                    className="size-5 transition-transform duration-500 ease-in-out [transform-style:preserve-3d] group-hover:[transform:rotateY(360deg)]"
                  />
                </span>

                <p
                  className={`mt-3 truncate text-small font-semibold ${
                    isActive ? "text-primary-dark" : "text-text"
                  }`}
                >
                  {card.label}
                </p>
              </div>

              {/* Second column */}
              <p className="text-h1 py-2 font-bold leading-none text-text">
                {card.count}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function DashboardCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-card border border-border bg-muted" />
      ))}
    </div>
  );
}
