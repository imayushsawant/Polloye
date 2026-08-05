import { type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone =
  | "neutral"
  | "sage"
  | "error"
  | "success"
  | "phase";

type Props = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-muted",
  sage: "bg-sage/15 text-sage",
  error: "bg-semantic-error/10 text-semantic-error",
  success: "bg-semantic-success/15 text-ink",
  /** Live quiz phase chip — quiet hairline pill */
  phase: "bg-surface-1 text-ink-muted border border-hairline",
};

/**
 * Small chip / phase badge. Use `tone="phase"` for live quiz phase labels.
 */
export function Badge({
  tone = "neutral",
  className,
  children,
  ...rest
}: Props) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-xs px-2 py-0.5",
        "text-caption font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
