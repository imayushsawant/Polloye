"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cx } from "@/components/ui";
import { TallyBars } from "./tally-bars";
import type { PublicOption } from "./types";

export type AnalyticsType = "BARCHART" | "PIE_CHART" | "DONUT_CHART";

type Props = {
  options: PublicOption[];
  optionCount: Record<string, number>;
  analyticsType?: AnalyticsType | string | null;
  /** Highlight correct options after reveal (host) */
  correctIds?: string[];
  showCorrect?: boolean;
  className?: string;
};

/** Report palette — matches cream/sage product UI (up to 4 options). */
const SEGMENT_COLORS = [
  "var(--report-orange)",
  "var(--report-blue)",
  "var(--report-green)",
  "var(--report-pink)",
] as const;

type SliceLabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  value?: number;
  fill?: string;
};

/** Count label parked just outside each slice, tinted to the segment. */
function SliceCountLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  outerRadius = 0,
  value = 0,
  fill = "var(--ink-muted)",
}: SliceLabelProps) {
  if (!value) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 12;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: 0,
        opacity: 0.92,
      }}
    >
      {value}
    </text>
  );
}

function normalizeAnalyticsType(
  value: string | null | undefined,
): AnalyticsType {
  if (value === "PIE_CHART" || value === "DONUT_CHART" || value === "BARCHART") {
    return value;
  }
  return "BARCHART";
}

/** Quiet chart silhouette while waiting for the first answer. */
function EmptyChartPlaceholder({ isDonut }: { isDonut: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 120 120"
        className="h-[70%] w-[70%] max-h-40 max-w-40"
        aria-hidden
      >
        {isDonut ? (
          <circle
            cx="60"
            cy="60"
            r="42"
            fill="none"
            stroke="var(--hairline)"
            strokeWidth="18"
          />
        ) : (
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="var(--surface-2)"
            stroke="var(--hairline)"
            strokeWidth="1.5"
          />
        )}
      </svg>
      <p className="text-caption pointer-events-none absolute m-0 text-ink-tertiary">
        Waiting for answers
      </p>
    </div>
  );
}

/**
 * Post-submit / host tallies: bar (custom), pie, or donut per question setting.
 */
export function OptionAnalytics({
  options,
  optionCount,
  analyticsType,
  correctIds = [],
  showCorrect = false,
  className,
}: Props) {
  const type = normalizeAnalyticsType(analyticsType);

  if (type === "BARCHART") {
    return (
      <TallyBars
        options={options}
        optionCount={optionCount}
        correctIds={correctIds}
        showCorrect={showCorrect}
        className={className}
      />
    );
  }

  const total = options.reduce(
    (sum, o) => sum + (optionCount[o.option_id] ?? 0),
    0,
  );

  const data = options.map((opt, i) => {
    const count = optionCount[opt.option_id] ?? 0;
    const isCorrect = showCorrect && correctIds.includes(opt.option_id);
    return {
      id: opt.option_id,
      name: opt.option_description,
      value: count,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      isCorrect,
    };
  });

  const pieData = data.filter((d) => d.value > 0);
  const isDonut = type === "DONUT_CHART";
  const innerRadius = isDonut ? "58%" : 0;

  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <div className="mx-auto h-52 w-full max-w-xs sm:h-56">
        {total === 0 ? (
          <EmptyChartPlaceholder isDonut={isDonut} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius="70%"
                paddingAngle={pieData.length > 1 ? 3 : 0}
                stroke="var(--canvas)"
                strokeWidth={3}
                isAnimationActive
                animationDuration={400}
                label={SliceCountLabel}
                labelLine={false}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.color}
                    opacity={showCorrect && !entry.isCorrect ? 0.45 : 1}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => {
                  const n = typeof value === "number" ? value : Number(value);
                  const pct =
                    total > 0 ? Math.round((n / total) * 100) : 0;
                  return [`${n} (${pct}%)`, "Votes"];
                }}
                contentStyle={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                  fontFamily:
                    "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
                  color: "var(--ink)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {data.map((entry) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-xs"
                  style={{ background: entry.color }}
                  aria-hidden
                />
                <span
                  className={cx(
                    "text-body-sm min-w-0 truncate",
                    entry.isCorrect ? "font-medium text-ink" : "text-ink",
                  )}
                >
                  {entry.name}
                  {entry.isCorrect ? " · Correct" : ""}
                </span>
              </span>
              <span className="text-mono shrink-0 text-ink-muted">
                {entry.value}
                {total > 0 ? ` · ${pct}%` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
