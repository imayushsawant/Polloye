import { type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

export type CardVariant = "default" | "muted" | "featured" | "mockup";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: "md" | "lg" | "xl" | "none";
  children: ReactNode;
};

const variantClass: Record<CardVariant, string> = {
  default: "bg-surface-1 text-ink border border-hairline rounded-lg",
  muted: "bg-surface-2 text-ink rounded-lg",
  featured: "bg-ink text-on-primary rounded-lg",
  mockup: "bg-surface-1 text-ink border border-hairline rounded-xl",
};

const paddingClass = {
  none: "",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
} as const;

/**
 * White-on-cream card. No drop shadows — lift comes from surface change + hairline.
 */
export function Card({
  variant = "default",
  padding = "lg",
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cx(
        variantClass[variant],
        paddingClass[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
