import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "accent";
export type ButtonSize = "md" | "sm";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-on-primary hover:bg-inverse-canvas active:bg-inverse-canvas",
  secondary:
    "bg-surface-1 text-ink border border-hairline hover:bg-surface-2 active:bg-surface-2",
  tertiary:
    "bg-canvas text-ink border border-transparent hover:bg-surface-2 active:bg-surface-2",
  accent:
    "bg-sage text-on-primary hover:opacity-90 active:opacity-85",
};

const sizeClass: Record<ButtonSize, string> = {
  md: "min-h-10 px-[18px] py-2.5",
  sm: "min-h-9 px-3.5 py-2",
};

/**
 * Polloye button.
 * - primary: charcoal system CTA
 * - secondary: white + hairline
 * - tertiary: quiet canvas
 * - accent: sage — Create / Begin / Join only
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  type = "button",
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 text-button rounded-md",
        "cursor-pointer transition-colors select-none",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        sizeClass[size],
        variantClass[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
