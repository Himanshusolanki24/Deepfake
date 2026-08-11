"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { cn } from "@/lib/utils";
import type { FrequencyPoint } from "@/types/analysis";

type Scale = "linear" | "log";
type Metric = "magnitude" | "comparison";

export function FrequencyChart({ data }: { data: FrequencyPoint[] }) {
  const [scale, setScale] = useState<Scale>("linear");
  const [metric, setMetric] = useState<Metric>("magnitude");

  const anomalyBands = useMemo(() => {
    const bands: { start: number; end: number }[] = [];
    data.forEach((p) => {
      if (p.anomalous) {
        if (bands.length && bands[bands.length - 1].end === p.frequency - 1) {
          bands[bands.length - 1].end = p.frequency;
        } else {
          bands.push({ start: p.frequency, end: p.frequency });
        }
      }
    });
    return bands;
  }, [data]);

  const peakDeviation = useMemo(() => {
    let max = 0;
    data.forEach((p) => {
      const d = Math.abs(p.magnitude - p.baseline);
      if (d > max) max = d;
    });
    return max.toFixed(2);
  }, [data]);

  const yTickFormatter = (v: number) => (scale === "log" ? Math.pow(10, v).toFixed(0) : `${v}`);

  const transform = (v: number) => (scale === "log" ? Math.log10(Math.max(v, 0.5)) : v);

  const chartData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        magnitude: transform(p.magnitude),
        baseline: transform(p.baseline),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, scale]
  );

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1" role="group" aria-label="Frequency chart metric">
          {(
            [
              { id: "magnitude", label: "Magnitude" },
              { id: "comparison", label: "Comparison" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                metric === m.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
              aria-pressed={metric === m.id}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Frequency chart scale">
          {(
            [
              { id: "linear", label: "Linear" },
              { id: "log", label: "Log Scale" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setScale(s.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                scale === s.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
              aria-pressed={scale === s.id}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px] px-2 py-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="freqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="frequency"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
              label={{ value: "Frequency (Hz)", position: "insideBottomRight", fontSize: 11, fill: "var(--color-muted-foreground)", dy: 4 }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={metric === "magnitude" ? yTickFormatter : undefined}
              width={44}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
              }}
              labelFormatter={(label) => `${label} Hz`}
              formatter={(value, name) => {
                if (name === "Baseline") return [typeof value === "number" ? value.toFixed(2) : value, name];
                return [typeof value === "number" ? (scale === "log" ? Math.pow(10, value).toFixed(2) : value.toFixed(2)) : value, name];
              }}
            />
            {anomalyBands.map((b) => (
              <ReferenceArea
                key={`${b.start}-${b.end}`}
                x1={b.start}
                x2={b.end}
                fill="var(--color-manipulated)"
                fillOpacity={0.12}
                stroke="var(--color-manipulated)"
                strokeOpacity={0.3}
                strokeDasharray="4 4"
              />
            ))}
            {metric === "magnitude" ? (
              <>
                <Area
                  type="monotone"
                  dataKey="baseline"
                  name="Normal Baseline"
                  stroke="var(--color-authentic)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  fill="none"
                />
                <Area
                  type="monotone"
                  dataKey="magnitude"
                  name="Magnitude"
                  stroke="var(--color-info)"
                  strokeWidth={2}
                  fill="url(#freqFill)"
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="magnitude"
                  name="Signal"
                  stroke="var(--color-info)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  name="Baseline"
                  stroke="var(--color-authentic)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-[3px] w-5 rounded-full bg-info" aria-hidden="true" />
            Signal magnitude
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-0 w-5 border-t-2 border-dashed border-authentic" aria-hidden="true" />
            Normal baseline
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-manipulated/15 ring-1 ring-manipulated/40" aria-hidden="true" />
            Anomaly band
          </span>
          <span className="ml-auto hidden items-center gap-3 md:flex">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="text-[10px] uppercase tracking-wider">Peak deviation</span>
              <span className="hex-mono font-semibold text-foreground">{peakDeviation}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="text-[10px] uppercase tracking-wider">Anomaly bands</span>
              <span className="hex-mono font-semibold text-foreground">{anomalyBands.length}</span>
            </span>
          </span>
        </div>
        <div className="mt-2 border-t border-border/60 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Finding
          </p>
          <p className="mt-1 text-sm text-foreground">
            Anomalous periodic energy detected in high-frequency bands (
            {anomalyBands.map((b) => (b.start === b.end ? `${b.start}` : `${b.start}–${b.end}`)).join(", ")}{" "}
            Hz). Deviation from natural baseline exceeds 2σ.
          </p>
        </div>
      </div>
    </div>
  );
}
