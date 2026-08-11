"use client";

import { motion } from "motion/react";
import type { Verdict } from "@/types/analysis";
import { VERDICT_LABELS, VERDICT_HEADLINES } from "@/types/analysis";

const VERDICT_COLORS: Record<Verdict, string> = {
  authentic: "var(--color-authentic)",
  suspicious: "var(--color-suspicious)",
  manipulated: "var(--color-manipulated)",
  inconclusive: "var(--color-inconclusive)",
};

const TICKS = [0, 25, 50, 75, 100];

export function ConfidenceGauge({
  value,
  verdict,
  size = 240,
  interval,
}: {
  value: number;
  verdict: Verdict;
  size?: number;
  interval?: { lower: number; upper: number };
}) {
  const color = VERDICT_COLORS[verdict];
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  // 270° gauge sweep starting at 135°
  const START = 135;
  const SWEEP = 270;
  const filled = (value / 100) * SWEEP;
  const clampAngle = (deg: number) => Math.max(0, Math.min(SWEEP, deg));

  const polar = (deg: number, r: number) => {
    const rad = ((deg + START) * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcPath = (angle: number, r: number) => {
    if (angle <= 0) return "";
    const start = polar(0, r);
    const end = polar(clampAngle(angle), r);
    const largeArc = angle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const track = arcPath(SWEEP, radius);
  const needleAngle = filled - 90;

  const intervalArc =
    interval && interval.upper > interval.lower
      ? arcPath(((interval.upper - interval.lower) / 100) * SWEEP, radius)
      : null;
  const intervalStartAngle = ((interval?.lower ?? value) / 100) * SWEEP;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Confidence ${value} percent, ${VERDICT_LABELS[verdict]}${interval ? `, confidence interval ${interval.lower} to ${interval.upper} percent` : ""}`}
    >
      <svg width={size} height={size} className="block">
        <defs>
          <linearGradient id="gauge-fill" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={track} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} strokeLinecap="round" />

        {intervalArc && (
          <g style={{ transformOrigin: "50% 50%", rotate: `${START + intervalStartAngle}deg` }}>
            <path
              d={arcPath(SWEEP, radius)}
              fill="none"
              stroke="var(--color-muted-foreground)"
              strokeOpacity="0.28"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </g>
        )}

        <motion.path
          d={track}
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          style={{ transformOrigin: "50% 50%", rotate: `${START}deg` }}
        />

        {TICKS.map((t) => {
          const angle = (t / 100) * SWEEP;
          const outer = polar(angle, radius - strokeWidth / 2);
          const inner = polar(angle, radius - strokeWidth / 2 - 4);
          return (
            <line
              key={t}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--color-muted-foreground)"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
          );
        })}

        <motion.g
          initial={{ rotate: 0 }}
          animate={{ rotate: needleAngle }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2}
            y2={size / 2 - radius + strokeWidth}
            stroke="var(--color-foreground)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </motion.g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-5xl font-semibold tabular tracking-tight"
          style={{ color }}
        >
          {value}
          <span className="text-2xl">%</span>
        </motion.span>
        <span className="mt-1 hex-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {VERDICT_HEADLINES[verdict]}
        </span>
      </div>
    </div>
  );
}

export function VerdictColorDot({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: VERDICT_COLORS[verdict] }}
      aria-hidden="true"
    />
  );
}
