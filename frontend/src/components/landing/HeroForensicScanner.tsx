"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "./AnimatedNumber";
import { FaceMedia } from "./FaceMedia";
import { EASE } from "@/lib/animations/constants";
import { prefersReducedMotionQuery, isCoarsePointer } from "@/lib/animations/scroll";
import { cn } from "@/lib/utils";

const SIGNALS = [
  { id: "spatial", label: "SPATIAL", value: 0.81, tone: "text-blue-700" },
  { id: "temporal", label: "TEMPORAL", value: 0.76, tone: "text-slate-700" },
  { id: "frequency", label: "FREQUENCY", value: 0.65, tone: "text-slate-700" },
  { id: "av", label: "A/V SYNC", value: 0.88, tone: "text-emerald-700" },
] as const;

const TICKER =
  "SCAN ▸ FACE DETECTED ▸ SPATIAL ANOMALY 0.81 ▸ FREQUENCY ANOMALY 0.65 ▸ TEMPORAL SIGNAL 0.76 ▸ A/V SYNC 0.88 ▸ ";

const ANOMALY_REGIONS = [
  { x: 0.3, y: 0.38, w: 0.18, h: 0.08 }, // left eye
  { x: 0.52, y: 0.38, w: 0.18, h: 0.08 }, // right eye
  { x: 0.36, y: 0.62, w: 0.28, h: 0.1 }, // mouth
];

export function HeroForensicScanner() {
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [overAnomaly, setOverAnomaly] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointerEnabled = useRef(false);

  useEffect(() => {
    if (prefersReducedMotionQuery() || isCoarsePointer()) return;
    pointerEnabled.current = true;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerEnabled.current || !frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const nx = x / r.width;
    const ny = y / r.height;
    setCursor({ x, y });
    const hit = ANOMALY_REGIONS.some(
      (a) => nx >= a.x && nx <= a.x + a.w && ny >= a.y && ny <= a.y + a.h
    );
    setOverAnomaly(hit);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[460px] px-2 sm:px-4">
      {/* Signal nodes */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.4, ease: EASE.out }}
        className="landing-mono absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-[#dbe2ec] bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-600 shadow-sm backdrop-blur"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
        SPATIAL <span className={SIGNALS[0].tone}>{SIGNALS[0].value.toFixed(2)}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.5, ease: EASE.out }}
        className="landing-mono absolute -left-2 top-[30%] z-20 flex items-center gap-1.5 rounded-md border border-[#dbe2ec] bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-600 shadow-sm backdrop-blur sm:-left-4"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
        TEMPORAL <span className={SIGNALS[1].tone}>{SIGNALS[1].value.toFixed(2)}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.6, ease: EASE.out }}
        className="landing-mono absolute -right-2 top-[42%] z-20 flex items-center gap-1.5 rounded-md border border-[#dbe2ec] bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-600 shadow-sm backdrop-blur sm:-right-4"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden="true" />
        FREQUENCY <span className={SIGNALS[2].tone}>{SIGNALS[2].value.toFixed(2)}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.7, ease: EASE.out }}
        className="landing-mono absolute -bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-[#dbe2ec] bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-600 shadow-sm backdrop-blur"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        A/V SYNC <span className={SIGNALS[3].tone}>{SIGNALS[3].value.toFixed(2)}</span>
      </motion.div>

      {/* Connector hairlines */}
      <div className="pointer-events-none absolute inset-x-[22%] top-0 bottom-[4%] z-10" aria-hidden="true">
        <motion.span
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, delay: 1.45, ease: EASE.out }}
          className="absolute left-1/2 top-0 h-10 w-px origin-top bg-gradient-to-b from-slate-400/30 to-transparent"
        />
      </div>

      {/* Media frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.9, ease: EASE.out }}
        className="relative mt-6 rounded-xl border border-[#dbe2ec] bg-white p-2.5 shadow-[0_24px_60px_-20px_rgb(16_24_40/0.18)]"
      >
        {/* Frame corner ticks */}
        <div className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
          {["left-2 top-2", "right-2 top-2", "left-2 bottom-2", "right-2 bottom-2"].map((p) => (
            <span key={p} className={cn("absolute h-3 w-3 border-slate-400/70", p, p.includes("left") ? "border-l" : "border-r", p.includes("top") ? "border-t" : "border-b")} />
          ))}
        </div>

        <div
          ref={frameRef}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setCursor(null)}
          className="relative aspect-[5/6] overflow-hidden rounded-lg bg-[#eef1f6] select-none"
        >
          <FaceMedia className="h-full w-full" />

          {/* Detection boxes */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {/* Head box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.8 }}
              className="absolute left-[12%] top-[15%] h-[58%] w-[76%] rounded-md border border-dashed border-blue-600/60"
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.9 }}
              className="landing-mono absolute left-[13%] top-[14%] -translate-y-full rounded-sm bg-blue-600/90 px-1.5 py-0.5 pt-1 text-[8px] font-semibold tracking-[0.14em] text-white"
            >
              FACE · 0.94
            </motion.span>

            {/* Eye boxes */}
            {[
              { l: "29%", w: "17%" },
              { l: "54%", w: "17%" },
            ].map((eye, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 1.8 + i * 0.12 }}
                className="absolute top-[38%] h-[9%] rounded-sm border border-amber-500/80"
                style={{ left: eye.l, width: eye.w }}
              />
            ))}

            {/* Mouth box + anomaly marker */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1.95 }}
              className="absolute left-[40%] top-[64%] h-[9%] w-[20%] rounded-sm border border-red-500/80"
            />
            <motion.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 2.0 }}
              className="absolute right-[8%] top-[70%] flex h-2.5 w-2.5 animate-anomaly rounded-full bg-red-600"
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 2.1 }}
              className="landing-mono absolute right-[13%] top-[86%] text-[8px] font-semibold tracking-[0.14em] text-red-600"
            >
              ANOMALY 0.82
            </motion.span>

            {/* Scan glow on face */}
            <div className="absolute left-[10%] top-[12%] h-[62%] w-[80%] rounded-lg bg-blue-500/0 opacity-0 blur-2xl transition-opacity duration-1000 animate-blink-soft" />
          </div>

          {/* Scanline */}
          <div
            className="pointer-events-none absolute inset-x-0 z-20"
            aria-hidden="true"
          >
            <div
              className="animate-scan-y absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-600 to-transparent shadow-[0_0_12px_rgba(37,99,235,0.35)]"
              style={{ animationDelay: "1.1s" }}
            />
          </div>

          {/* Confidence chip */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 2.2, ease: EASE.out }}
            className="absolute bottom-3 right-3 z-30 flex w-32 flex-col gap-1 rounded-md border border-[#dbe2ec] bg-white/90 px-2.5 py-2 shadow-sm backdrop-blur"
          >
            <span className="landing-mono text-[8px] font-semibold tracking-[0.18em] text-slate-400">
              CONFIDENCE
            </span>
            <span className="landing-mono text-lg font-bold leading-none text-[#111827]">
              <AnimatedNumber value={87} suffix="%" delay={2.2} duration={1.4} />
            </span>
            <span className="relative h-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.2, delay: 2.35, ease: EASE.out }}
                className="absolute inset-0 origin-left rounded-full bg-[#2563eb]"
              />
            </span>
          </motion.div>

          {/* State ticker */}
          <div
            className="absolute inset-x-0 bottom-0 z-20 overflow-hidden border-t border-[#e4e9f0] bg-white/90 backdrop-blur"
            aria-hidden="true"
          >
            <div className="animate-ticker flex w-max items-center gap-6 whitespace-nowrap py-1.5 pl-4">
              <span className="landing-mono text-[9px] font-medium tracking-[0.18em] text-slate-500">
                {TICKER + TICKER}
              </span>
            </div>
          </div>

          {/* Cursor readout */}
          {cursor && (
            <div
              className="pointer-events-none absolute z-40"
              style={{ left: cursor.x, top: cursor.y }}
              aria-hidden="true"
            >
              <span
                className={cn(
                  "absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2",
                  "before:absolute before:left-1/2 before:top-0 before:h-full before:w-px before:bg-slate-500",
                  "after:absolute after:top-1/2 after:left-0 after:h-px after:w-full after:bg-slate-500"
                )}
              />
              <span className="landing-mono absolute left-2 top-3 whitespace-nowrap rounded-sm bg-[#111827]/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {overAnomaly ? (
                  <>ANOMALY · 0.82</>
                ) : (
                  <>X {Math.round(cursor.x)} · Y {Math.round(cursor.y)}</>
                )}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}