"use client";

import { useRef } from "react";
import { motion, type MotionValue, useScroll, useTransform } from "motion/react";
import { Reveal } from "./Reveal";
import { FaceMedia } from "./FaceMedia";
import { SECTION } from "./section";

const LAYERS = [
  { label: "PIXEL", value: "+3.2σ", tone: "#2563eb", x: -74, y: -116 },
  { label: "FREQUENCY", value: "+2.1σ", tone: "#7c3aed", x: 74, y: -72 },
  { label: "TEMPORAL", value: "+1.8σ", tone: "#d97706", x: -74, y: 56 },
  { label: "AUDIO", value: "+2.6σ", tone: "#dc2626", x: 74, y: 104 },
  { label: "METADATA", value: "GAP", tone: "#0f766e", x: 0, y: 132 },
] as const;

function LayerChip({
  layer,
  progress,
}: {
  layer: (typeof LAYERS)[number];
  progress: MotionValue<number>;
}) {
  const x = useTransform(progress, [0.05, 0.75], [0, layer.x]);
  const y = useTransform(progress, [0.05, 0.75], [0, layer.y]);
  const opacity = useTransform(progress, [0.05, 0.2, 0.75], [0.9, 1, 1]);

  return (
    <motion.div style={{ x, y, opacity }} className="absolute left-1/2 top-1/2 z-10">
      <div
        className="flex w-32 -translate-x-1/2 -translate-y-1/2 flex-col gap-1 rounded-md border bg-white px-3 py-2 shadow-sm"
        style={{ borderColor: `${layer.tone}55` }}
      >
        <span className="landing-mono text-[9px] font-bold tracking-[0.18em]" style={{ color: layer.tone }}>
          {layer.label}
        </span>
        <span className="landing-mono text-[10px] font-semibold text-slate-600">
          {layer.value}
        </span>
        <span className="relative h-1 overflow-hidden rounded-full bg-slate-100">
          <span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${40 + LAYERS.indexOf(layer) * 10}%`, backgroundColor: layer.tone }}
          />
        </span>
      </div>
    </motion.div>
  );
}

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const authenticOverlayOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.3],
    [1, 0.7, 0]
  );

  return (
    <section id="problem" className={`scroll-mt-24 ${SECTION.section}`}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-10">
        <div className="flex max-w-xl flex-col">
          <Reveal>
            <p className="landing-mono flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <span className="h-px w-8 bg-slate-400" aria-hidden="true" />
              01 · The Problem
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-[#111827] sm:text-5xl lg:text-6xl">
              Seeing isn&rsquo;t
              <br />
              believing anymore.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-pretty text-base leading-7 text-slate-500 sm:text-lg">
              Synthetic media is becoming increasingly difficult to distinguish
              from authentic content. A single classifier is not enough — the
              anomalies are distributed across many independent signals.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <dl className="mt-9 grid grid-cols-3 gap-4">
              {[
                { k: "GENERATION", v: "improving" },
                { k: "DETECTABLE", v: "in signals" },
                { k: "REQUIRED", v: "multi-signal" },
              ].map((item) => (
                <div key={item.k} className="rounded-lg border border-[#e5e7eb] bg-white p-3">
                  <dt className="landing-mono text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                    {item.k}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[#111827]">{item.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* Media frame that unpacks layers */}
        <div ref={ref} className="relative mx-auto w-full max-w-[440px]">
          <div
            className="relative aspect-[5/6] overflow-hidden rounded-xl border border-[#dbe2ec] bg-white p-2.5 shadow-[0_24px_60px_-20px_rgb(16_24_40/0.14)]"
            aria-label="A media frame decomposing into forensic layers"
          >
            <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#eef1f6]">
              <FaceMedia className="h-full w-full" />

              <motion.div
                style={{ opacity: authenticOverlayOpacity }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1322]/55 backdrop-blur-[1px]"
              >
                <span className="landing-mono rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold tracking-[0.3em] text-white">
                  AUTHENTIC?
                </span>
              </motion.div>

              {LAYERS.map((layer) => (
                <LayerChip key={layer.label} layer={layer} progress={scrollYProgress} />
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-xl" aria-hidden="true">
            <span className="landing-mono absolute -left-4 top-8 hidden text-[9px] tracking-[0.2em] text-slate-400/70 sm:block">
              SPLIT VIEW
            </span>
            <span className="landing-mono absolute -right-4 bottom-8 hidden text-[9px] tracking-[0.2em] text-slate-400/70 sm:block">
              MULTI-SIGNAL
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}