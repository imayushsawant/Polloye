"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui";

export function QuestionTimer({
  durationMs,
  shownAt,
}: {
  durationMs: number;
  shownAt?: number | null;
}) {
  const [remaining, setRemaining] = useState(durationMs);

  useEffect(() => {
    // If we don't have shownAt, it means the server didn't provide a start time (e.g. legacy/testing)
    if (!shownAt) {
      setRemaining(durationMs);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - shownAt;
      const r = Math.max(0, durationMs - Math.floor(elapsed));
      setRemaining(r);
    };

    tick();
    const interval = setInterval(tick, 100);

    return () => clearInterval(interval);
  }, [durationMs, shownAt]);

  const seconds = Math.ceil(remaining / 1000);
  const isDanger = remaining > 0 && seconds <= 5; // last 5 seconds

  return (
    <div
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium transition-colors",
        isDanger
          ? "bg-semantic-error/10 text-semantic-error animate-pulse"
          : "bg-surface-1 border border-hairline text-ink-subtle"
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="tabular-nums w-[42px] text-center">
        {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
      </span>
    </div>
  );
}
