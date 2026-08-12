"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { SectionHeading } from "./SectionHeading";
import { FaceMedia } from "./FaceMedia";
import { cn, formatSeconds } from "@/lib/utils";

const FRAMES = [
  { t: 0, suspicion: 0.22, high: false },
  { t: 7, suspicion: 0.31, high: false },
  { t: 14, suspicion: 0.82, high: true },
  { t: 21, suspicion: 0.74, high: true },
  { t: 28, suspicion: 0.24, high: false },
];

export function VideoForensicsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const playheadLeft = useTransform(smooth, [0, 1], [0, 90]);
  const time = useTransform(smooth, [0, 1], [0, 30]);
  const timeText = useTransform(time, (v) => formatSeconds(Math.round(v)));

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const i = Math.min(FRAMES.length - 1, Math.max(0, Math.floor(p * FRAMES.length)));
    setActive((prev) => (prev === i ? prev : i));
  });

  const frame = FRAMES[active];
  const high = frame.high;

  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Video forensics"
          title={
            <>
              Authenticity changes
              <br />
              frame by frame.
            </>
          }
          description={
            <>
              A manipulated sequence is not uniform. AUTHENTIQ scores every
              frame and flags where the signal diverges — down to the exact
              cut.
            </>
          }
        />

        <div ref={ref} className="mt-16 rounded-2xl border border-[#e5e7eb] bg-[#F7F8FA] p-6 shadow-[0_24px_60px_-24px_rgb(16_24_40/0.12)] sm:p-10">
          {/* Frame strip */}
          <div className="grid grid-cols-5 gap-3 sm:gap-4">
            {FRAMES.map((f, i) => (
              <div key={i}>
                <div
                  className={cn(
                    "relative aspect-[9/16] overflow-hidden rounded-lg border bg-white transition-all duration-300",
                    i === active ? "border-[#1d4ed8] shadow-lg shadow-blue-100" : "border-[#e5e7eb] opacity-80"
                  )}
                >
                  <FaceMedia className="h-full w-full" />
                  {f.high && (
                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                      <div className="absolute left-[24%] top-[30%] h-[14%] w-[52%] rounded-sm border border-dashed border-red-500/80" />
                      <span className="absolute left-[26%] top-[28%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 animate-anomaly" />
                    </div>
                  )}
                  <span className="landing-mono absolute left-1.5 top-1.5 rounded-sm bg-[#0b1322]/75 px-1 py-0.5 text-[8px] font-semibold text-white">
                    {String(f.t).padStart(2, "0")}:{String(0).padStart(2, "0")}
                  </span>
                </div>
                <p
                  className={cn(
                    "landing-mono mt-2 text-center text-[9px] font-bold tracking-[0.14em] transition-colors",
                    i === active && f.high ? "text-red-600" : i === active ? "text-blue-600" : "text-slate-400"
                  )}
                >
                  {f.suspicion < 0.4 ? `LOW · ${f.suspicion.toFixed(2)}` : `HIGH · ${f.suspicion.toFixed(2)}`}
                </p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative mt-10">
            <div className="relative h-4 border-x border-[#dbe2ec] bg-white">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(to_right,#94a3b8_2px,transparent_2px)] bg-[length:26px_2px]" />
              <motion.div
                style={{ left: playheadLeft }}
                className="absolute top-1/2 -translate-y-1/2"
              >
                <span className="flex items-center gap-1">
                  <span className="h-4 w-0.5 rounded-full bg-[#1d4ed8]" />
                  <span className="landing-mono rounded-sm bg-[#1d4ed8] px-1.5 py-0.5 text-[8px] font-bold tracking-[0.14em] text-white">
                    <motion.span>{timeText}</motion.span>
                  </span>
                </span>
              </motion.div>
            </div>
            <div className="mt-2 flex justify-between">
              {["00:00", "00:10", "00:20", "00:30"].map((t, i) => (
                <span key={t} className="landing-mono text-[9px] tracking-[0.14em] text-slate-400">
                  {t}
                  {i === 2 && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-sm bg-red-100 px-1 py-0.5 text-[8px] font-bold text-red-600">
                      <span className="h-1 w-1 rounded-full bg-red-500 animate-blink-soft" />
                      ANOMALY
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Active frame readout */}
          <div className="mt-10 flex flex-col items-stretch justify-between gap-6 rounded-xl border border-[#e5e7eb] bg-white p-6 sm:flex-row sm:items-center">
            <div>
              <p className="landing-mono text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                PLAYBACK POSITION
              </p>
              <p className="landing-mono mt-1 text-2xl font-bold text-[#111827]">
                FRAME {String(1482 - active * 12)}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="landing-mono text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                FRAME SUSPICION
              </p>
              <p className={cn("mt-1 text-3xl font-bold tracking-tight", high ? "text-red-600" : "text-emerald-600")}>
                {(frame.suspicion * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}