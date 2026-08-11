"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
  width?: number;
  height?: number;
  id?: string;
}

export function Sparkline({
  data,
  color = "var(--color-info)",
  className,
  width = 120,
  height = 36,
  id,
}: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - 3 - ((v - min) / range) * (height - 6);
    return `${x},${y}`;
  });
  const gradId = id ?? "spark";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polygon
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
        fill={`url(#${gradId})`}
      />
      <motion.polyline
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
