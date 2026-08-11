"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Play, Flag } from "lucide-react";
import type { SuspiciousFrame } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { formatSeconds } from "@/lib/utils";

interface Segment {
  start: number;
  end: number;
  score: number;
}

function scoreTone(score: number): string {
  if (score >= 0.6) return "var(--color-manipulated)";
  if (score >= 0.4) return "var(--color-suspicious)";
  return "var(--color-authentic)";
}

export function VideoTimeline({
  frames,
  duration,
  selected,
  onSelect,
}: {
  frames: SuspiciousFrame[];
  duration: number;
  selected: number | null;
  onSelect: (timestamp: number) => void;
}) {
  const segments = useMemo<Segment[]>(() => {
    const t = (f: SuspiciousFrame) => (f.timestamp / Math.max(duration, 1)) * 100;
    const segs: Segment[] = [];
    const abnormal = frames.filter((f) => f.score >= 0.6);
    abnormal.forEach((f) => {
      segs.push({ start: Math.max(0, t(f) - 1.5), end: Math.min(100, t(f) + 1.5), score: f.score });
    });
    return segs;
  }, [frames, duration]);

  const ticks = useMemo(() => {
    const count = Math.min(5, Math.max(3, Math.floor(duration / 8)));
    return Array.from({ length: count }, (_, i) => (i / (count - 1)) * 100);
  }, [duration]);

  return (
    <div>
      <div className="relative mt-4 rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Per-frame suspicion score
          </p>
          <span className="hex-mono text-[10px] text-muted-foreground tabular">
            {formatSeconds(duration)} total
          </span>
        </div>
        <div className="relative h-14" role="group" aria-label="Video suspicion timeline">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-secondary" />
          {segments.map((s, i) => (
            <motion.div
              key={i}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="absolute top-1/2 h-4 -translate-y-1/2 rounded-sm"
              style={{
                left: `${s.start}%`,
                width: `${s.end - s.start}%`,
                backgroundColor: scoreTone(s.score),
                opacity: 0.35,
              }}
            />
          ))}
          {frames.map((f) => {
            const left = (f.timestamp / Math.max(duration, 1)) * 100;
            const abnormal = f.score >= 0.6;
            return (
              <button
                key={f.frame}
                onClick={() => onSelect(f.timestamp)}
                className={cn(
                  "absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-transform hover:scale-125",
                  selected === f.timestamp
                    ? "z-10 h-6 w-6 border-primary bg-primary text-primary-foreground"
                    : "h-4 w-4 border-border bg-card",
                  abnormal && "border-manipulated/50"
                )}
                style={{ left: `${left}%` }}
                aria-label={`Jump to frame ${f.frame} at ${formatSeconds(f.timestamp)}`}
              >
                {selected === f.timestamp && <Play className="h-2.5 w-2.5" />}
                {abnormal && selected !== f.timestamp && (
                  <Flag className="h-2 w-2 text-manipulated" />
                )}
              </button>
            );
          })}
        </div>
        <div className="relative mt-1 flex justify-between" aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={i} className="hex-mono text-[9px] text-muted-foreground tabular">
              {formatSeconds((t / 100) * duration)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Suspicious frames
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sr-only">
              <tr>
                <th>Frame</th>
                <th>Timestamp</th>
                <th>Score</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {frames.map((f) => (
                <tr
                  key={f.frame}
                  onClick={() => onSelect(f.timestamp)}
                  className={cn(
                    "cursor-pointer border-b border-border last:border-0 hover:bg-accent/60",
                    selected === f.timestamp && "bg-accent"
                  )}
                >
                  <td className="px-4 py-2">
                    <span className="hex-mono text-[12px] font-semibold text-foreground">
                      Frame {String(f.frame).padStart(4, "0")}
                    </span>
                  </td>
                  <td className="hex-mono px-2 py-2 text-[11px] text-muted-foreground tabular">
                    {formatSeconds(f.timestamp)}
                  </td>
                  <td className="px-2 py-2">
                    <span className="hex-mono text-[12px] font-semibold tabular" style={{ color: scoreTone(f.score) }}>
                      {f.score.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-[11px] text-muted-foreground">{f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
