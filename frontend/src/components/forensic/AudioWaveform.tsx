"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatSeconds } from "@/lib/utils";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function WaveformCanvas({
  duration,
  seed,
  segments,
  highlight,
  height = 96,
}: {
  duration: number;
  seed: number;
  segments: { start: number; end: number; score: number }[];
  highlight?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const rng = mulberry32(seed);
    const bars = 220;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < bars; i++) {
      const pct = i / bars;
      const time = pct * duration;
      const isSuspicious = segments.some((s) => time >= s.start && time <= s.end);
      const envelope =
        0.5 +
        0.5 *
          Math.sin(i * 0.35 + seed) *
          Math.sin(i * 0.11 + seed * 0.7) *
          (0.4 + 0.6 * rng());
      const amp = isSuspicious ? Math.max(envelope, 0.72) : envelope * 0.8;
      const barW = W / bars;
      const barH = Math.max(4, amp * H * 0.9);
      const x = i * barW;
      const y = (H - barH) / 2;

      if (isSuspicious) {
        ctx.fillStyle = "rgba(220,38,38,0.85)";
      } else if (highlight !== undefined && Math.abs(time - highlight) < 0.6) {
        ctx.fillStyle = "rgba(37,99,235,0.9)";
      } else {
        ctx.fillStyle = "rgba(37,99,235,0.45)";
      }
      ctx.fillRect(x, y, Math.max(1, barW - 1), barH);
    }

    // segment overlay boxes
    segments.forEach((s) => {
      const x = (s.start / duration) * W;
      const w = ((s.end - s.start) / duration) * W;
      ctx.strokeStyle = "rgba(220,38,38,0.9)";
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x, 2, w, H - 4);
    });
    ctx.setLineDash([]);
  }, [duration, seed, segments, highlight]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={height * 2}
      className={cn("h-[var(--wh)] w-full rounded-md", "bg-[#0c1424]")}
      style={{ ["--wh" as string]: `${height}px` }}
      role="img"
      aria-label="Audio waveform with suspicious segments highlighted in red"
    />
  );
}

export function SpectrogramCanvas({
  seed,
  height = 140,
}: {
  seed: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const rng = mulberry32(seed + 7);
    const imageData = ctx.createImageData(W, H);

    for (let y = 0; y < H; y++) {
      const freq = 1 - y / H; // low freq at bottom
      for (let x = 0; x < W; x++) {
        const t = x / W;
        const idx = (y * W + x) * 4;
        const harmonic = Math.sin(t * 2 * Math.PI * 12) * 0.5 + Math.sin(t * 2 * Math.PI * 7 + 2) * 0.5;
        const base = 0.25 + 0.45 * Math.exp(-Math.pow(freq * 2 - 0.8, 2) * 4);
        const noise = rng() * 0.08;
        const anomaly = t > 0.2 && t < 0.32 && freq > 0.5 ? 0.55 : 0;
        const anomaly2 = t > 0.58 && t < 0.71 && freq > 0.45 ? 0.65 : 0;
        let v = base + noise + harmonic * 0.12 + anomaly + anomaly2;
        v = Math.min(1, v);
        // viridis-ish: low freq red/yellow, else blue/cyan
        let r, g, b;
        if (freq > 0.5 && (anomaly || anomaly2)) {
          r = 220;
          g = 60;
          b = 50;
        } else if (v > 0.55) {
          r = 90;
          g = 200;
          b = 180;
        } else {
          r = 30;
          g = 70;
          b = 160;
        }
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [seed]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={height * 2}
      className={cn("h-[var(--sh)] w-full rounded-md", "bg-[#0c1424]")}
      style={{ ["--sh" as string]: `${height}px` }}
      role="img"
      aria-label="Audio spectrogram with anomalous bands highlighted"
    />
  );
}

export function AudioTimelineStrip({
  duration,
  segments,
  onSelect,
  selected,
}: {
  duration: number;
  segments: { start: number; end: number; score: number }[];
  onSelect: (time: number) => void;
  selected: number | null;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Suspicious segments
        </p>
        <span className="hex-mono text-[10px] text-muted-foreground tabular">{formatSeconds(duration)}</span>
      </div>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-secondary" />
        {segments.map((s, i) => {
          const left = (s.start / duration) * 100;
          const width = ((s.end - s.start) / duration) * 100;
          return (
            <button
              key={i}
              onClick={() => onSelect(s.start)}
              className={cn(
                "absolute top-1/2 h-5 -translate-y-1/2 rounded-sm border border-manipulated/40 bg-manipulated/25 transition-colors hover:bg-manipulated/40",
                selected === s.start && "bg-manipulated/50"
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
              aria-label={`Suspicious segment from ${formatSeconds(s.start)} to ${formatSeconds(s.end)}, score ${Math.round(s.score * 100)} percent`}
            >
              <span className="sr-only">{Math.round(s.score * 100)}% suspicious</span>
            </button>
          );
        })}
        <div className="absolute inset-x-0 bottom-0 flex justify-between" aria-hidden="true">
          <span className="hex-mono text-[9px] text-muted-foreground tabular">00:00</span>
          <span className="hex-mono text-[9px] text-muted-foreground tabular">{formatSeconds(duration / 2)}</span>
          <span className="hex-mono text-[9px] text-muted-foreground tabular">{formatSeconds(duration)}</span>
        </div>
      </div>
    </div>
  );
}
