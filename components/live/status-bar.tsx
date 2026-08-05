"use client";

import { cx } from "@/components/ui";

type Props = {
  rank: number | null;
  totalScore: number | null;
  className?: string;
};

/**
 * Bottom-center floating pill: rank · total score.
 */
export function StatusBar({ rank, totalScore, className }: Props) {
  const rankLabel = rank != null ? `#${rank}` : "—";
  const scoreLabel = totalScore != null ? String(totalScore) : "—";

  return (
    <div
      className={cx(
        "pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4",
        className,
      )}
    >
      <div
        className={cx(
          "pointer-events-auto inline-flex items-center gap-3 rounded-lg",
          "border border-hairline bg-surface-1 px-5 py-2.5",
        )}
        role="status"
        aria-live="polite"
      >
        <span className="text-caption text-ink-subtle">Rank</span>
        <span className="text-mono text-ink">{rankLabel}</span>
        <span className="text-ink-tertiary" aria-hidden>
          ·
        </span>
        <span className="text-caption text-ink-subtle">Score</span>
        <span className="text-mono text-ink">{scoreLabel}</span>
      </div>
    </div>
  );
}
