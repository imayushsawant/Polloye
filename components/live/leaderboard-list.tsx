"use client";

import { cx } from "@/components/ui";
import type { LeaderboardRow } from "./types";

type Props = {
  rows: LeaderboardRow[];
  /** Emphasize this participant name when present */
  highlightName?: string;
  className?: string;
  compact?: boolean;
};

/**
 * Editorial ranked list — typographic, mono scores. No charts.
 */
export function LeaderboardList({
  rows,
  highlightName,
  className,
  compact = false,
}: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-body-sm m-0 text-ink-muted">No scores yet.</p>
    );
  }

  return (
    <ol className={cx("m-0 list-none p-0", className)}>
      {rows.map((row, i) => {
        const rank = i + 1;
        const isYou =
          highlightName != null &&
          row.participant_name === highlightName;
        const isPodium = rank <= 3 && !compact;

        return (
          <li
            key={`${row.participant_id ?? row.participant_name}-${i}`}
            className={cx(
              "flex items-baseline justify-between gap-4 border-b border-hairline-soft",
              compact ? "py-2.5" : "py-3.5",
              isYou && "bg-sage/5 -mx-2 px-2 rounded-md",
            )}
          >
            <div className="flex min-w-0 items-baseline gap-3">
              <span
                className={cx(
                  "text-mono shrink-0 tabular-nums",
                  isPodium ? "text-ink" : "text-ink-tertiary",
                  compact ? "w-6" : "w-7",
                )}
              >
                {rank}
              </span>
              <span
                className={cx(
                  "truncate",
                  isPodium ? "text-body-lg text-ink" : "text-body text-ink",
                  isYou && "font-medium",
                )}
              >
                {row.participant_name}
                {isYou ? " (you)" : ""}
              </span>
            </div>
            <span className="text-mono shrink-0 text-ink-muted">
              {row.total_score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
