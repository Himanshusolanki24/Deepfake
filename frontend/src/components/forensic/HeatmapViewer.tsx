"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minus, Flame } from "lucide-react";
import type { HeatmapRegion } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type ViewMode = "original" | "heatmap" | "difference" | "frequency";

const MODES: { id: ViewMode; label: string }[] = [
  { id: "original", label: "Original" },
  { id: "heatmap", label: "Heatmap" },
  { id: "difference", label: "Difference" },
  { id: "frequency", label: "Frequency" },
];

const REGION_COLORS = [
  [255, 90, 60],
  [255, 140, 40],
  [250, 200, 40],
  [120, 200, 255],
];

export function HeatmapViewer({
  regions,
  filename,
}: {
  regions: HeatmapRegion[];
  filename: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<ViewMode>("heatmap");
  const [intensity, setIntensity] = useState(0.75);
  const [showRegions, setShowRegions] = useState(true);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ x: number; y: number; width: number; region: HeatmapRegion } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Base: procedural synthetic face media
    drawBase(ctx, W, H, mode === "frequency");

    if (mode === "heatmap" || mode === "difference") {
      drawHeatmap(ctx, regions, intensity, mode === "difference");
    }

    if (showRegions && (mode === "heatmap" || mode === "difference")) {
      drawRegionBoxes(ctx, regions);
    }
  }, [regions, intensity, mode, showRegions]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(4, Math.max(1, s + (e.deltaY < 0 ? 0.15 : -0.15))));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      setPan({
        x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
      });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || mode === "frequency") return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const W = canvas.width;
    const H = canvas.height;
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const my = ((e.clientY - rect.top) / rect.height) * H;
    const region = regions.find(
      (r) =>
        mx >= (r.x / 100) * W &&
        mx <= ((r.x + r.width) / 100) * W &&
        my >= (r.y / 100) * H &&
        my <= ((r.y + r.height) / 100) * H
    );
    if (region) {
      setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, width: rect.width, region });
    } else {
      setHover(null);
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1" role="group" aria-label="Heatmap view mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                mode === m.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
              aria-pressed={mode === m.id}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <Flame className="h-3.5 w-3.5 text-manipulated" />
            <Slider
              value={[intensity]}
              onValueChange={([v]) => setIntensity(v)}
              min={0}
              max={1}
              step={0.05}
              className="w-24"
              aria-label="Heatmap intensity"
            />
            <span className="hex-mono w-8 text-right text-[10px] text-muted-foreground tabular">
              {Math.round(intensity * 100)}%
            </span>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <Switch checked={showRegions} onCheckedChange={setShowRegions} className="h-4 w-7 [&_span]:h-3 [&_span]:w-3 [&_span]:data-[state=checked]:translate-x-3" />
            Regions
          </label>
        </div>
      </div>

      <div
        className="grid-paper relative overflow-hidden bg-[#0a0f1a]"
        onWheel={handleWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
        role="application"
        aria-label="Forensic image heatmap viewer"
      >
        <div
          className="absolute left-0 top-0 transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "center",
            width: "100%",
            height: "100%",
          }}
        >
          <canvas
            ref={canvasRef}
            width={960}
            height={600}
            className="block w-full"
            style={{ aspectRatio: "16 / 10" }}
            aria-label={`Heatmap overlay of ${filename}`}
          />
        </div>

        <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
          {mode} view
        </div>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 w-44 rounded-md border border-border bg-[#0b1322] px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(hover.x + 12, hover.width - 180),
              top: Math.max(hover.y - 56, 8),
            }}
          >
            <p className="truncate font-semibold text-white">{hover.region.label}</p>
            <p className="mt-0.5 text-[11px] text-sidebar-muted">
              Anomaly confidence{" "}
              <span className="hex-mono font-semibold text-manipulated">
                {Math.round(hover.region.intensity * 100)}%
              </span>
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col gap-1">
          <Button size="icon-sm" variant="secondary" className="pointer-events-auto" onClick={() => setScale((s) => Math.min(4, s + 0.25))} aria-label="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="secondary" className="pointer-events-auto" onClick={() => setScale((s) => Math.max(1, s - 0.25))} aria-label="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="secondary" className="pointer-events-auto" onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} aria-label="Reset view">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="secondary" className="pointer-events-auto lg:hidden" aria-label="Fullscreen">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Minus className="h-3 w-3 text-manipulated" />
          High confidence anomaly
        </span>
        <span className="flex items-center gap-1.5">
          <Minus className="h-3 w-3 text-suspicious" />
          Moderate
        </span>
        <span className="flex items-center gap-1.5">
          <Minus className="h-3 w-3 text-info" />
          Baseline
        </span>
        <span className="ml-auto hidden sm:block">Drag to pan · scroll to zoom</span>
      </div>
    </div>
  );
}

function drawBase(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  frequencyMode: boolean
) {
  const cx = W / 2;
  const cy = H / 2;

  // background gradient (simulated frame)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1b2436");
  bg.addColorStop(0.5, "#243049");
  bg.addColorStop(1, "#161e2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // face silhouette
  ctx.save();
  ctx.translate(cx, cy * 0.92);
  ctx.scale(1, 1.06);
  ctx.beginPath();
  ctx.arc(0, 0, H * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = "#c9a17a";
  ctx.fill();
  // jaw taper
  ctx.beginPath();
  ctx.moveTo(-H * 0.24, H * 0.05);
  ctx.quadraticCurveTo(0, H * 0.28, H * 0.24, H * 0.05);
  ctx.quadraticCurveTo(H * 0.24, H * 0.18, 0, H * 0.3);
  ctx.quadraticCurveTo(-H * 0.24, H * 0.18, -H * 0.24, H * 0.05);
  ctx.fillStyle = "#c9a17a";
  ctx.fill();
  // hair
  ctx.beginPath();
  ctx.arc(0, -H * 0.06, H * 0.25, Math.PI, 0);
  ctx.fillStyle = "#2a2a33";
  ctx.fill();

  if (frequencyMode) {
    // draw scanning frequency lines instead of face details
    ctx.strokeStyle = "rgba(120,200,255,0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const y = (i / 40) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y + Math.sin(i * 1.3) * 8);
      ctx.stroke();
    }
  }

  // eyes + mouth (subtle)
  if (!frequencyMode) {
    ctx.fillStyle = "#2b2b31";
    ctx.beginPath();
    ctx.ellipse(-H * 0.085, -H * 0.02, H * 0.022, H * 0.014, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(H * 0.085, -H * 0.02, H * 0.022, H * 0.014, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, H * 0.1, H * 0.035, H * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(cx, cy, H * 0.3, cx, cy, H * 0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  regions: HeatmapRegion[],
  intensity: number,
  difference: boolean
) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  regions.forEach((r, i) => {
    const [cr, cg, cb] = REGION_COLORS[i % REGION_COLORS.length];
    const rx = (r.x / 100) * W;
    const ry = (r.y / 100) * H;
    const rw = (r.width / 100) * W;
    const rh = (r.height / 100) * H;
    const alpha = r.intensity * intensity;
    const g = ctx.createRadialGradient(
      rx + rw / 2,
      ry + rh / 2,
      1,
      rx + rw / 2,
      ry + rh / 2,
      Math.max(rw, rh) * 1.15
    );
    const soft = difference ? `rgba(${cr},${cg},${cb},${alpha * 0.85})` : `rgba(${cr},${cg},${cb},${alpha})`;
    g.addColorStop(0, soft);
    g.addColorStop(0.55, `rgba(${cr},${cg},${cb},${alpha * 0.35})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
}

function drawRegionBoxes(ctx: CanvasRenderingContext2D, regions: HeatmapRegion[]) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  regions.forEach((r) => {
    const rx = (r.x / 100) * W;
    const ry = (r.y / 100) * H;
    const rw = (r.width / 100) * W;
    const rh = (r.height / 100) * H;
    ctx.strokeStyle = r.intensity > 0.7 ? "rgba(255,90,60,0.9)" : "rgba(250,200,40,0.8)";
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.fillStyle = r.intensity > 0.7 ? "rgba(255,90,60,0.9)" : "rgba(250,200,40,0.8)";
    ctx.font = "600 13px monospace";
    ctx.fillText(`${r.label} ${Math.round(r.intensity * 100)}%`, rx + 4, ry - 4);
  });
  ctx.setLineDash([]);
}
