import { type HTMLAttributes, type ReactNode } from "react";
import { Eyebrow } from "./eyebrow";
import { cx } from "./cx";

type Props = HTMLAttributes<HTMLDivElement> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

/**
 * Calm empty list / zero-state panel on cream.
 */
export function EmptyState({
  eyebrow,
  title,
  description,
  action,
  className,
  ...rest
}: Props) {
  return (
    <div
      className={cx(
        "flex flex-col items-start gap-3 rounded-lg border border-hairline",
        "bg-surface-1 p-8 text-left",
        className,
      )}
      {...rest}
    >
      {eyebrow != null && <Eyebrow>{eyebrow}</Eyebrow>}
      <h3 className="text-card-title m-0 text-ink">{title}</h3>
      {description != null && (
        <p className="text-body-sm m-0 max-w-md text-ink-muted">{description}</p>
      )}
      {action != null && <div className="mt-2">{action}</div>}
    </div>
  );
}
