"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "motion/react";
import { ArrowDown, ArrowRight, ScanSearch } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { EASE } from "@/lib/animations/constants";

const PIPELINE = [
  { id: "raw", label: "RAW MEDIA", sub: "Image · video · audio" },
  { id: "signals", label: "FORENSIC SIGNALS", sub: "Spatial · spectral · temporal" },
  { id: "evidence", label: "EVIDENCE", sub: "Attributed, inspectable anomalies" },
  { id: "confidence", label: "CALIBRATED CONFIDENCE", sub: "Uncertainty made explicit" },
] as const;

function ConfidenceGauge() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div ref={ref} className="relative w-full max-w-[380px]">
      <svg viewBox="0 0 200 118" className="w-full" aria-hidden="true">
        {/* Rail */}
        <path
          d="M16 108 A 84 84 0 0 1 184 108"
          pathLength={100}
          fill="none"
          stroke="#eceff4"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* CI band 82–91 */}
        <path
          d="M16 108 A 84 84 0 0 1 184 108"
          pathLength={100}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="10"
          strokeLinecap="butt"
          strokeDasharray="9 91"
          strokeDashoffset="-82"
          opacity={inView ? 0.95 : 0.2}
          className="transition-opacity duration-700"
        />
        {/* Confidence fill */}
        <motion.path
          d="M16 108 A 84 84 0 0 1 184 108"
          fill="none"
          stroke="#2563eb"
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 0.87 } : { pathLength: 0 }}
          transition={{ duration: 1.4, ease: EASE.out }}
        />
        {/* Ticks */}
        {[0, 25, 50, 75, 100].map((t) => {
          const a = Math.PI * (1 - t / 100);
          const x = 100 + 74 * Math.cos(a);
          const y = 108 - 74 * Math.sin(a);
          return (
            <g key={t}>
              <line
                x1={x}
                y1={y}
                x2={x + 5 * Math.cos(a)}
                y2={y - 5 * Math.sin(a)}
                stroke="#c7cdd8"
                strokeWidth="1"
              />
              <text
                x={x}
                y={y - (t === 50 ? 12 : 8)}
                textAnchor="middle"
                fontSize="7"
                fill="#94a3b8"
                fontFamily="var(--font-mono)"
              >
                {t}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pb-8">
        <span className="landing-mono text-[9px] font-semibold tracking-[0.2em] text-slate-400">
          MANIPULATION PROBABILITY
        </span>
        <span className="mt-1 text-5xl font-bold tracking-tight text-[#111827]">
          <AnimatedNumber value={87} suffix="%" duration={1.6} />
        </span>
        <span className="landing-mono mt-1 text-[10px] font-semibold text-amber-600">
          82–91% INTERVAL
        </span>
        <span className="landing-mono text-[10px] text-slate-400">calibrated</span>
      </div>
    </div>
  );
}

export function EvidenceSection() {
  return (
    <section className="relative overflow-hidden bg-[#F7F8FA] py-24 sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute right-[-10%] top-10 h-72 w-72 rounded-full bg-blue-50 blur-3xl" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="03 · From raw media to evidence"
          title={
            <>
              We don&rsquo;t return
              <br />
              a guess.
            </>
          }
          description={
            <>
              Every assessment is a chain: raw media in, independent forensic
              signals analyzed, evidence extracted, and a confidence that
              states its own uncertainty.
            </>
          }
        />

        {/* Pipeline */}
        <div className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {PIPELINE.map((stage, i) => (
            <div key={stage.id} className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Reveal delay={i * 0.12} className="flex-1">
                <div className="group h-full rounded-xl border border-[#e5e7eb] bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-blue-600">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <ArrowDown className="h-3.5 w-3.5 text-slate-300 lg:hidden" />
                  </div>
                  <p className="mt-6 text-sm font-semibold tracking-[0.08em] text-[#111827]">
                    {stage.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{stage.sub}</p>
                </div>
              </Reveal>
              {i < PIPELINE.length - 1 && (
                <div className="hidden lg:block" aria-hidden="true">
                  <motion.span
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.12, ease: EASE.out }}
                    className="block origin-left"
                  >
                    <ArrowRight className="mx-1.5 h-4 w-4 text-slate-300" />
                  </motion.span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Verdict panel */}
        <Reveal delay={0.2}>
          <div className="mt-16 grid grid-cols-1 items-center gap-10 rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-[0_24px_60px_-24px_rgb(16_24_40/0.16)] sm:p-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
            <div className="flex justify-center">
              <ConfidenceGauge />
            </div>
            <div className="space-y-6">
              <div>
                <p className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                  VERDICT
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
                  High probability of manipulation
                </p>
              </div>
              <div className="landing-mono flex items-center gap-3 rounded-lg border border-red-100 bg-red-50/70 px-4 py-3 text-xs font-semibold tracking-[0.12em] text-red-600">
                <ScanSearch className="h-4 w-4" />
                5 / 7 SIGNALS SUSPICIOUS
              </div>
              <ul className="space-y-2.5">
                {[
                  { k: "Spatial anomaly", v: "0.81" },
                  { k: "Frequency anomaly", v: "0.65" },
                  { k: "Temporal inconsistency", v: "0.76" },
                  { k: "A/V mismatch", v: "0.88" },
                  { k: "Metadata", v: "inconclusive" },
                ].map((row) => (
                  <li
                    key={row.k}
                    className="flex items-center justify-between border-b border-[#eef1f6] pb-2 text-sm"
                  >
                    <span className="text-slate-600">{row.k}</span>
                    <span className="landing-mono text-xs font-semibold text-slate-500">
                      {row.v}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/analyze"
                  className="group inline-flex items-center gap-2 rounded-lg bg-[#111827] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1f2a40]"
                >
                  Analyze your media
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
                <span className="landing-mono text-[11px] font-medium tracking-[0.14em] text-slate-400">
                  HUMAN REVIEW RECOMMENDED
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}