"use client";

import { cx } from "@/components/ui";
import type { PublicOption } from "./types";

type Props = {
  options: PublicOption[];
  optionCount: Record<string, number>;
  /** Highlight correct options after reveal (host) */
  correctIds?: string[];
  showCorrect?: boolean;
  className?: string;
};

/**
 * Same-color horizontal tally bars for all options. Count on the right.
 */
export function TallyBars({
  options,
  optionCount,
  correctIds = [],
  showCorrect = false,
  className,
}: Props) {
  const counts = options.map((o) => optionCount[o.option_id] ?? 0);
  const max = Math.max(1, ...counts);

  return (
    <div className={cx("flex flex-col gap-3", className)}>
      {options.map((opt) => {
        const count = optionCount[opt.option_id] ?? 0;
        const pct = Math.round((count / max) * 100);
        const isCorrect = showCorrect && correctIds.includes(opt.option_id);

        return (
          <div key={opt.option_id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={cx(
                  "text-body-sm min-w-0 truncate",
                  isCorrect ? "text-ink font-medium" : "text-ink",
                )}
              >
                {opt.option_description}
                {isCorrect ? " · Correct" : ""}
              </span>
              <span className="text-mono shrink-0 text-ink-muted">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-xs bg-surface-2">
              <div
                className={cx(
                  "h-full rounded-xs transition-[width] duration-300 ease-out",
                  isCorrect ? "bg-sage" : "bg-ink-muted/50",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
