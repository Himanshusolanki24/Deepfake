"use client";

import { useRef, useState } from "react";
import {
  motion,
  type MotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { FaceMedia } from "./FaceMedia";
import { usePrefersReducedMotion } from "@/lib/animations/scroll";
import { EASE } from "@/lib/animations/constants";
import { cn } from "@/lib/utils";

type Node = {
  id: string;
  label: string;
  sub: string;
  value: string;
  tone: string;
  anchor: string;
  line: [number, number];
  range: [number, number];
};

const NODES: Node[] = [
  {
    id: "spatial", label: "SPATIAL", sub: "Facial texture & blending", value: "0.81",
    tone: "#2563eb", anchor: "left-[50%] top-[8%]", line: [50, 24], range: [0.16, 0.3],
  },
  {
    id: "frequency", label: "FREQUENCY", sub: "Hidden spectral anomalies", value: "0.65",
    tone: "#7c3aed", anchor: "left-[89%] top-[24%]", line: [86, 30], range: [0.32, 0.46],
  },
  {
    id: "temporal", label: "TEMPORAL", sub: "Frame inconsistencies", value: "0.76",
    tone: "#d97706", anchor: "left-[10%] top-[24%]", line: [14, 30], range: [0.48, 0.6],
  },
  {
    id: "avsync", label: "A/V SYNC", sub: "Lip vs audio alignment", value: "0.88",
    tone: "#0f766e", anchor: "left-[89%] top-[70%]", line: [86, 68], range: [0.62, 0.74],
  },
  {
    id: "physio", label: "PHYSIOLOGICAL", sub: "rPPG · blink · motion", value: "0.71",
    tone: "#16a34a", anchor: "left-[50%] top-[88%]", line: [50, 74], range: [0.76, 0.88],
  },
  {
    id: "provenance", label: "PROVENANCE", sub: "Metadata · C2PA", value: "GAP",
    tone: "#64748b", anchor: "left-[10%] top-[70%]", line: [14, 68], range: [0.76, 0.88],
  },
];

const STEP_TEXT: { label: string; title: string }[] = [
  { label: "MEDIA INGESTION", title: "The media arrives, untouched." },
  { label: "SPATIAL ANALYSIS", title: "Spatial analysis activates." },
  { label: "FREQUENCY LAYER", title: "A frequency layer appears." },
  { label: "TEMPORAL LAYER", title: "Temporal layer appears." },
  { label: "A/V SYNC LAYER", title: "Audio-visual sync layer." },
  { label: "PHYSIO + PROVENANCE", title: "Physiological and provenance signals." },
  { label: "SIGNAL FUSION", title: "All signals converge." },
];

function stepFor(p: number): number {
  if (p < 0.14) return 1;
  if (p < 0.3) return 2;
  if (p < 0.46) return 3;
  if (p < 0.6) return 4;
  if (p < 0.74) return 5;
  if (p < 0.88) return 6;
  return 7;
}

function ConnectLines() {
  return (
    <>
      {NODES.map((node) => {
        const [x1, y1, x2, y2] = [50, 52, node.line[0], node.line[1]];
        return (
          <svg
            key={node.id}
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <motion.line
              key={node.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.45 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, delay: 0.2, ease: EASE.out }}
              stroke={node.tone}
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
              strokeDasharray="3 3"
            />
          </svg>
        );
      })}
    </>
  );
}

function FusionNode({
  node,
  progress,
  reduced,
}: {
  node: Node;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const opacity = useTransform(
    progress,
    reduced ? [0, 1] : [node.range[0], node.range[0] + 0.06, node.range[1]],
    reduced ? [1, 1, 1] : [0.3, 1, 1]
  );
  return (
    <motion.div
      style={{ opacity }}
      className={cn("absolute z-10 -translate-x-1/2 -translate-y-1/2", node.anchor)}
    >
      <div className="w-28 rounded-md border border-[#dbe2ec] bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur sm:w-36">
        <div className="flex items-center justify-between gap-1">
          <span
            className="landing-mono truncate text-[9px] font-bold tracking-[0.12em]"
            style={{ color: node.tone }}
          >
            {node.label}
          </span>
          <span className="landing-mono text-[9px] font-bold text-slate-700">
            {node.value}
          </span>
        </div>
        <p className="mt-0.5 hidden truncate text-[9px] text-slate-400 sm:block">
          {node.sub}
        </p>
      </div>
    </motion.div>
  );
}

function FusionVisual({ reduced }: { reduced: boolean }) {
  const [step, setStep] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const assessmentOpacity = useTransform(
    scrollYProgress,
    reduced ? [0.25, 0.55] : [0.9, 0.985],
    [0, 1]
  );

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const s = stepFor(p);
    setStep((prev) => (prev === s ? prev : s));
  });

  const current = STEP_TEXT[step - 1];

  return (
    <div ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="forensic-grid-fine landing-grid-mask absolute inset-0 opacity-60" />
        </div>

        <div className="relative z-20 flex items-center gap-3 px-5">
          <span className="landing-mono rounded-md border border-[#dbe2ec] bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.2em] text-slate-500 backdrop-blur">
            STEP {String(step).padStart(2, "0")} / 07
          </span>
          <span className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-slate-400">
            {current?.label}
          </span>
        </div>
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE.out }}
          className="relative z-20 mt-3 max-w-md px-5 text-center text-lg font-medium text-[#111827] sm:text-xl"
        >
          {current?.title}
        </motion.p>

        <div className="relative z-10 mt-4 flex w-full max-w-6xl flex-1 items-center justify-center px-6">
          <div className="relative aspect-square w-full max-w-[580px]">
            <ConnectLines />

            {NODES.map((node) => (
              <FusionNode key={node.id} node={node} progress={scrollYProgress} reduced={reduced} />
            ))}

            {/* Media center */}
            <div className="absolute left-1/2 top-1/2 z-10 w-[min(34vw,190px)] -translate-x-1/2 -translate-y-1/2">
              <div className="relative aspect-[5/6] overflow-hidden rounded-xl border border-[#dbe2ec] bg-white p-1.5 shadow-[0_24px_60px_-20px_rgb(16_24_40/0.18)]">
                <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#eef1f6]">
                  <FaceMedia className="h-full w-full" />
                </div>
              </div>
            </div>

            {/* Assessment overlay */}
            <motion.div
              style={{ opacity: assessmentOpacity }}
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            >
              <div className="flex flex-col items-center">
                <div className="relative aspect-[5/6] w-[min(40vw,220px)] overflow-hidden rounded-xl border border-[#dbe2ec] bg-white p-2 shadow-[0_24px_60px_-20px_rgb(16_24_40/0.2)]">
                  <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#eef1f6]">
                    <FaceMedia className="h-full w-full" />
                    <div className="absolute left-[12%] top-[15%] h-[58%] w-[76%] rounded-md border border-dashed border-red-500/70" />
                  </div>
                </div>
                <div className="mt-2 w-fit rounded-xl border border-[#dbe2ec] bg-white px-4 py-3 shadow-[0_24px_60px_-20px_rgb(16_24_40/0.2)]">
                  <p className="landing-mono text-center text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                    FINAL ASSESSMENT
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-3">
                    <p className="text-3xl font-bold tracking-tight text-[#111827]">87%</p>
                    <span className="landing-mono rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-bold tracking-[0.12em] text-red-600">
                      HIGH PROBABILITY
                    </span>
                  </div>
                  <p className="landing-mono mt-1.5 text-center text-[9px] tracking-[0.14em] text-slate-500">
                    5 / 7 SIGNALS SUSPICIOUS
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-2.5 lg:flex" aria-hidden="true">
          {STEP_TEXT.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                step === i + 1 ? "bg-[#111827]" : "bg-slate-300"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SignalFusionSection() {
  const reduced = usePrefersReducedMotion();

  return (
    <section id="how-it-works" className="relative scroll-mt-24 bg-[#F7F8FA]">
      <div className="mx-auto max-w-7xl px-5 pt-24 sm:px-8 lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: EASE.out }}
          className="max-w-3xl"
        >
          <p className="landing-mono flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            <span className="h-px w-8 bg-slate-400" aria-hidden="true" />
            02 · How It Works
          </p>
          <h2 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-[#111827] sm:text-5xl lg:text-6xl">
            One signal can fail.
            <br />
            Multiple signals tell the story.
          </h2>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-500 sm:text-lg">
            Keep scrolling. Watch a single media file move through an
            independent forensic analysis — each layer contributing evidence
            toward one calibrated assessment.
          </p>
        </motion.div>
      </div>

      <FusionVisual reduced={reduced} />
    </section>
  );
}