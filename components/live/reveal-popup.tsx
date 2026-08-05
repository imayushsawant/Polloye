"use client";

import { cx } from "@/components/ui";

type Props = {
  open: boolean;
  correct: boolean;
  attainedScore: number;
};

/**
 * Centered white reveal card — Correct/Wrong + points for this question.
 */
export function RevealPopup({ open, correct, attainedScore }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-title"
    >
      <div
        className={cx(
          "w-full max-w-sm rounded-xl border border-hairline bg-surface-1",
          "px-8 py-10 text-center",
        )}
      >
        <p
          id="reveal-title"
          className={cx(
            "text-headline m-0",
            correct ? "text-ink" : "text-ink",
          )}
        >
          {correct ? "Correct" : "Wrong"}
        </p>
        <p className="text-mono mt-4 m-0 text-ink-muted">
          {attainedScore > 0 ? `+${attainedScore}` : "0"} pts
        </p>
      </div>
    </div>
  );
}
