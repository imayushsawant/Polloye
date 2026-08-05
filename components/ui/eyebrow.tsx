import { type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

type Props = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  /** Soft muted (default) or sage brand emphasis */
  tone?: "muted" | "sage" | "ink";
};

/**
 * Section eyebrow — sentence case, 14px / 500. Never all-caps.
 */
export function Eyebrow({
  tone = "muted",
  className,
  children,
  ...rest
}: Props) {
  const toneClass =
    tone === "sage"
      ? "text-sage"
      : tone === "ink"
        ? "text-ink"
        : "text-ink-muted";

  return (
    <p className={cx("text-eyebrow m-0", toneClass, className)} {...rest}>
      {children}
    </p>
  );
}
