"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "motion/react";
import { ArrowRight, Flame, Eye, AlertTriangle } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { FaceMedia } from "./FaceMedia";
import { EASE } from "@/lib/animations/constants";

const HEAT_BLOBS = [
  { left: "36%", top: "37%", size: "20%", c: "rgba(239,68,68,0.5)" },
  { left: "60%", top: "37%", size: "20%", c: "rgba(239,68,68,0.5)" },
  { left: "48%", top: "60%", size: "26%", c: "rgba(217,119,6,0.42)" },
  { left: "46%", top: "8%", size: "34%", c: "rgba(245,158,11,0.28)" },
  { left: "30%", top: "48%", size: "40%", c: "rgba(37,99,235,0.14)" },
  { left: "58%", top: "46%", size: "36%", c: "rgba(37,99,235,0.12)" },
];

const REGIONS = [
  { label: "FACE BOUNDARY", color: "bg-blue-500", box: "border-blue-500" },
  { label: "EYES", color: "bg-amber-500", box: "border-amber-500" },
  { label: "MOUTH", color: "bg-red-500", box: "border-red-500" },
  { label: "SKIN TEXTURE", color: "bg-slate-400", box: "border-slate-400" },
  { label: "HAIR / EDGES", color: "bg-emerald-500", box: "border-emerald-500" },
];

export function ExplainEvidenceSection() {
  const heatRef = useRef<HTMLDivElement>(null);
  const inView = useInView(heatRef, { once: true, amount: 0.4 });

  return (
    <section id="evidence" className="relative scroll-mt-24 bg-white py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Evidence you can see"
          title={
            <>
              Every result has
              <br />
              an explanation.
            </>
          }
          description={
            <>
              The score is never the endpoint. AUTHENTIQ attributes the
              assessment to visible, inspectable anomalies across the media.
            </>
          }
        />

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          {/* Forensic image with heatmap */}
          <Reveal delay={0.1}>
            <div
              ref={heatRef}
              className="relative overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-2.5 shadow-[0_24px_60px_-24px_rgb(16_24_40/0.16)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#eef1f6]">
                <FaceMedia className="h-full w-full" />

                {/* Heat overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 1.2, ease: EASE.out }}
                  className="absolute inset-0"
                  aria-hidden="true"
                >
                  {HEAT_BLOBS.map((b, i) => (
                    <span
                      key={i}
                      className="absolute rounded-full blur-2xl"
                      style={{
                        left: b.left,
                        top: b.top,
                        width: b.size,
                        height: b.size,
                        backgroundImage: `radial-gradient(circle, ${b.c} 0%, transparent 70%)`,
                      }}
                    />
                  ))}
                </motion.div>

                {/* Detection boxes */}
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.7, delay: 0.4, ease: EASE.out }}
                    className="absolute left-[14%] top-[16%] h-[56%] w-[72%] rounded-md border border-dashed border-blue-500/70"
                  />
                  {[
                    { l: "33%", w: "14%", t: "38%", h: "8%", d: 0.5 },
                    { l: "56%", w: "14%", t: "38%", h: "8%", d: 0.55 },
                    { l: "43%", w: "18%", t: "62%", h: "8%", d: 0.6 },
                  ].map((box, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={inView ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.6, delay: box.d, ease: EASE.out }}
                      className="absolute rounded-sm border border-amber-500/80"
                      style={{ left: box.l, top: box.t, width: box.w, height: box.h }}
                    />
                  ))}
                </div>

                {/* Sweep reading */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-blue-200/30 to-transparent animate-sweep-x"
                  aria-hidden="true"
                />

                {/* Tags */}
                <div
                  className="landing-mono absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-[#0b1322]/80 px-2 py-1 text-[9px] font-semibold tracking-[0.16em] text-white"
                  aria-hidden="true"
                >
                  <Flame className="h-3 w-3 text-amber-400" />
                  HEATMAP · SPATIAL CONFIDENCE
                </div>
                <span className="landing-mono absolute right-3 top-3 rounded-sm bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.14em] text-slate-500 backdrop-blur">
                  FRAME 01482
                </span>
              </div>
            </div>
          </Reveal>

          {/* Side panel */}
          <Reveal delay={0.2}>
            <div className="flex h-full flex-col justify-center rounded-2xl border border-[#e5e7eb] bg-[#F7F8FA] p-7">
              <div className="flex items-center justify-between">
                <span className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                  SPATIAL ARTIFACTS
                </span>
                <span className="landing-mono flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  SUSPICIOUS
                </span>
              </div>
              <p className="mt-4 text-5xl font-bold tracking-tight text-[#111827]">
                0.81
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Detected inconsistent facial texture and blending patterns —
                localized to the periorbital and mouth regions.
              </p>

              <div className="my-6 h-px bg-[#e5e7eb]" />

              <p className="landing-mono mb-3 text-[9px] font-semibold tracking-[0.18em] text-slate-400">
                HIGHLIGHTED REGIONS
              </p>
              <ul className="space-y-2.5">
                {REGIONS.map((region) => (
                  <li key={region.label} className="flex items-center gap-2.5 text-[13px] text-slate-600">
                    <span
                      className={`h-2 w-2 rounded-full ${region.color}`}
                      aria-hidden="true"
                    />
                    {region.label}
                  </li>
                ))}
              </ul>

              <Link
                href="/evidence"
                className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                <Eye className="h-4 w-4" />
                View evidence
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}