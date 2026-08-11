"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import type { SuspiciousFrame } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { formatSeconds } from "@/lib/utils";
import { VideoTimeline } from "./VideoTimeline";
import { Button } from "@/components/ui/button";

interface FrameInvestigationProps {
  filename: string;
  frames: SuspiciousFrame[];
  duration: number;
}

export function FrameInvestigation({ filename, frames, duration }: FrameInvestigationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const drawFrame = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const t = time / Math.max(duration, 1);
      const frame = frames.find((f) => Math.abs(f.timestamp - time) < 0.5);
      const anomaly = frame && frame.score >= 0.6;

      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#1a2233");
      bg.addColorStop(1, "#131b29");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // head + subtle motion based on time
      ctx.save();
      ctx.translate(W / 2 + Math.sin(t * 9) * 6, H / 2);
      ctx.rotate(Math.sin(t * 2.4) * 0.03);
      ctx.beginPath();
      ctx.arc(0, -10, H * 0.27, 0, Math.PI * 2);
      ctx.fillStyle = "#c9a17a";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-H * 0.27, -5);
      ctx.quadraticCurveTo(0, H * 0.26, H * 0.27, -5);
      ctx.quadraticCurveTo(H * 0.27, H * 0.1, 0, H * 0.3);
      ctx.quadraticCurveTo(-H * 0.27, H * 0.1, -H * 0.27, -5);
      ctx.fillStyle = "#c9a17a";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -H * 0.18, H * 0.28, Math.PI, 0);
      ctx.fillStyle = "#23232b";
      ctx.fill();

      // eyes: blink oscillation
      const blink = Math.abs(Math.sin(t * Math.PI * 0.8));
      ctx.fillStyle = "#26262c";
      ctx.beginPath();
      ctx.ellipse(-H * 0.095, -H * 0.02, H * 0.024, H * 0.014 * (0.2 + blink * 0.8), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(H * 0.095, -H * 0.02, H * 0.024, H * 0.014 * (0.2 + blink * 0.8), 0, 0, Math.PI * 2);
      ctx.fill();

      // mouth: drives by anomaly (lip-sync offset)
      const mouthH = anomaly ? H * 0.03 : H * 0.018 + Math.sin(t * 14) * H * 0.004;
      ctx.beginPath();
      ctx.ellipse(0, H * 0.11, H * 0.04, mouthH, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#8a5a52";
      ctx.fill();

      ctx.restore();

      // anomaly indicator overlay
      if (anomaly && frame) {
        ctx.strokeStyle = "rgba(220,38,38,0.85)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        const w = H * 0.34;
        ctx.strokeRect(W / 2 - w / 2, H / 2 - w / 2, w, w);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(220,38,38,0.9)";
        ctx.font = "600 13px monospace";
        ctx.fillText("SUSPICIOUS REGION", W / 2 - w / 2 + 8, H / 2 - w / 2 - 6);
      }

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, W, 30);
      ctx.fillStyle = "#cfd8e6";
      ctx.font = "600 12px monospace";
      ctx.fillText(filename, 10, 20);
      ctx.fillStyle = "#7fb4ff";
      ctx.textAlign = "right";
      ctx.fillText(formatSeconds(time), W - 10, 20);
      ctx.textAlign = "left";
      if (frame) {
        ctx.fillStyle = anomaly ? "#ff6b5e" : "#8a94a6";
        ctx.fillText(`FRAME ${String(frame.frame).padStart(4, "0")}  score ${frame.score.toFixed(2)}`, 10, H - 12);
      }
    },
    [filename, frames, duration]
  );

  useEffect(() => {
    drawFrame(currentTime);
  }, [currentTime, drawFrame]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCurrentTime((t) => {
        if (t + dt >= duration) {
          setPlaying(false);
          return duration;
        }
        return t + dt;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, duration]);

  const selectFrame = (timestamp: number) => {
    setCurrentTime(timestamp);
    setSelected(timestamp);
  };

  const seekRelative = (delta: number) => {
    setCurrentTime((t) => Math.max(0, Math.min(duration, t + delta)));
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-[#0a0f1a] shadow-sm">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="block w-full"
          role="img"
          aria-label={`Synthetic frame preview of ${filename}`}
        />
        <div className="flex items-center gap-3 border-t border-sidebar-border bg-[#0c1424] px-4 py-3">
          <Button size="icon-sm" variant="ghost" className="text-[#c9d3e3] hover:bg-[#162238] hover:text-white" onClick={() => seekRelative(-1.5)} aria-label="Back 1.5 seconds">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon-sm" variant="secondary" className="bg-[#1c2a42] text-white hover:bg-[#24344f]" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="icon-sm" variant="ghost" className="text-[#c9d3e3] hover:bg-[#162238] hover:text-white" onClick={() => seekRelative(1.5)} aria-label="Forward 1.5 seconds">
            <SkipForward className="h-4 w-4" />
          </Button>
          <div className="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-[#243145]">
            <div
              className="h-full bg-[#7fb4ff]"
              style={{ width: `${(currentTime / Math.max(duration, 1)) * 100}%` }}
            />
          </div>
          <span className="hex-mono text-[11px] text-[#8a94a6] tabular">
            {formatSeconds(currentTime)} / {formatSeconds(duration)}
          </span>
          <Volume2 className="h-3.5 w-3.5 text-[#8a94a6]" />
        </div>
      </div>

      <VideoTimeline
        frames={frames}
        duration={duration}
        selected={selected}
        onSelect={selectFrame}
      />

      <p className="flex items-center gap-2 rounded-md border border-suspicious/20 bg-suspicious-soft px-3 py-2 text-xs text-suspicious">
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        Clicking a suspicious frame seeks the investigation view to that timestamp and reveals its forensic signals.
      </p>
    </div>
  );
}

export { cn };
