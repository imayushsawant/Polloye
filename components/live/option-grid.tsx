"use client";

import { cx } from "@/components/ui";
import type { PublicOption } from "./types";

type Props = {
  options: PublicOption[];
  selectedIds: string[];
  onToggle: (optionId: string) => void;
  disabled?: boolean;
  /** After reveal — mark correct options */
  correctIds?: string[];
  showCorrect?: boolean;
  /** `roomy` = larger desktop option cards (participant). Mobile stays the same. */
  size?: "default" | "roomy";
  className?: string;
};

/**
 * Live answer options. 2×2 when exactly 4; otherwise responsive grid/stack.
 * ≥44px targets, hairline borders, sage tint when selected.
 */
export function OptionGrid({
  options,
  selectedIds,
  onToggle,
  disabled = false,
  correctIds = [],
  showCorrect = false,
  size = "default",
  className,
}: Props) {
  const count = options.length;
  const roomy = size === "roomy";
  const gridClass =
    count === 4
      ? "grid-cols-2"
      : count === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : count === 2
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1";

  return (
    <div
      className={cx(
        "grid gap-3",
        roomy && "md:gap-4 md:flex-1 md:auto-rows-fr",
        gridClass,
        className,
      )}
    >
      {options.map((opt) => {
        const selected = selectedIds.includes(opt.option_id);
        const isCorrect = correctIds.includes(opt.option_id);
        const revealCorrect = showCorrect && isCorrect;
        const revealWrong = showCorrect && selected && !isCorrect;
        const hasImage = Boolean(opt.opt_img_link);
        const hasText = Boolean(opt.option_description?.trim());

        return (
          <button
            key={opt.option_id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt.option_id)}
            className={cx(
              "min-h-11 rounded-lg border px-4 py-3.5 text-left",
              "text-body-lg transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              "disabled:cursor-default",
              roomy && "md:min-h-0 md:px-5 md:py-5 md:text-subhead",
              revealCorrect
                ? "border-sage bg-sage/15 text-ink"
                : revealWrong
                  ? "border-semantic-error/40 bg-semantic-error/5 text-ink"
                  : selected
                    ? "border-sage bg-sage/10 text-ink"
                    : "border-hairline bg-surface-1 text-ink hover:border-ink-tertiary",
            )}
          >
            <span
              className={cx(
                "flex flex-col gap-2",
                roomy && "md:h-full md:justify-center md:gap-3",
              )}
            >
              {hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={opt.opt_img_link!}
                  alt=""
                  className={cx(
                    "max-h-36 w-full rounded-md object-contain",
                    roomy
                      ? "md:max-h-[min(28vh,18rem)]"
                      : "md:max-h-56",
                  )}
                />
              ) : null}
              {hasText ? (
                <span>{opt.option_description}</span>
              ) : !hasImage ? (
                <span className="text-ink-muted">—</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
