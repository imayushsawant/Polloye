import { type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

/**
 * Text input — white surface, hairline border, 8px radius, body type.
 */
export function Input({
  label,
  hint,
  error,
  className,
  id,
  disabled,
  ...rest
}: Props) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      {label != null && (
        <span className="text-body-sm font-medium text-ink">{label}</span>
      )}
      <input
        id={id}
        disabled={disabled}
        className={cx(
          "w-full min-h-11 rounded-md border bg-surface-1 px-3.5 py-2.5",
          "text-body text-ink placeholder:text-ink-tertiary",
          "outline-none transition-colors",
          "focus:border-ink focus:ring-0",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-2",
          error ? "border-semantic-error" : "border-hairline",
        )}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error != null && (
        <span className="text-caption text-semantic-error">{error}</span>
      )}
      {error == null && hint != null && (
        <span className="text-caption text-ink-subtle">{hint}</span>
      )}
    </label>
  );
}
