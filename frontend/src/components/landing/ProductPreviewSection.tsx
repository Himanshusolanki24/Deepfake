"use client";

import { motion } from "motion/react";
import { ArrowRight, Radio, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { EASE } from "@/lib/animations/constants";
import { cn } from "@/lib/utils";

const EVIDENCE = [
  { label: "SPATIAL ARTIFACTS", v: "0.81", tone: "text-amber-600", bar: "w-[81%] bg-amber-400" },
  { label: "FREQUENCY ANOMALY", v: "0.65", tone: "text-amber-600", bar: "w-[65%] bg-violet-400" },
  { label: "TEMPORAL INCONSISTENCY", v: "0.76", tone: "text-amber-600", bar: "w-[76%] bg-amber-400" },
  { label: "A/V MISMATCH", v: "0.88", tone: "text-red-600", bar: "w-[88%] bg-red-400" },
  { label: "PROVENANCE GAP", v: "—", tone: "text-slate-400", bar: "w-[10%] bg-slate-200" },
] as const;

function TopBar() {
  return (
    <div className="flex items-center gap-3 border-b border-[#eef1f6] bg-[#F7F8FA] px-4 py-2.5">
      <div className="flex gap-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
      </div>
      <span className="landing-mono mx-auto rounded-md border border-[#e5e7eb] bg-white px-3 py-1 text-[10px] tracking-[0.1em] text-slate-400">
        authentiq.app/analysis/VID-2026-01B72
      </span>
      <span className="landing-mono hidden items-center gap-1.5 text-[9px] font-semibold tracking-[0.14em] text-emerald-600 sm:flex">
        <span className="h-1.5 w-1.5 animate-blink-soft rounded-full bg-emerald-500" />
        LIVE
      </span>
    </div>
  );
}

export function ProductPreviewSection() {
  return (
    <section id="product" className="relative scroll-mt-24 overflow-hidden bg-[#F7F8FA] py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          align="center"
          eyebrow="The product"
          title="Built for investigation."
          description="One surface shows the verdict, the evidence behind it, and the calibrated uncertainty — ready for review, hand-off, or export."
        />

        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.9, ease: EASE.out }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <div className="rounded-2xl border border-[#dbe2ec] bg-white shadow-[0_40px_90px_-30px_rgb(16_24_40/0.3)]">
            <TopBar />
            <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
              {/* Verdict */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: 0.2, ease: EASE.out }}
                className="p-6"
              >
                <span className="landing-mono text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                  VERDICT
                </span>
                <div className="mt-4 flex items-end gap-2">
                  <p className="text-6xl font-bold tracking-tight text-[#111827]">87%</p>
                  <div className="mb-2 space-y-1">
                    <span className="landing-mono block rounded-md border border-red-100 bg-red-50 px-2 py-0.5 text-[8px] font-bold tracking-[0.12em] text-red-600">
                      HIGH PROBABILITY
                    </span>
                    <span className="landing-mono block text-[9px] font-semibold tracking-[0.12em] text-slate-400">
                      CI 82–91%
                    </span>
                  </div>
                </div>
                <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-[#eef1f6]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.4, ease: EASE.out }}
                    className="absolute inset-y-0 left-0 w-[87%] origin-left rounded-full bg-gradient-to-r from-[#2563eb] to-[#d97706]"
                  />
                  {/* CI window */}
                  <span className="absolute left-[82%] top-0 h-full w-[9%] border-x border-white/70 bg-amber-400/30" />
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                  <ScanSearch className="h-3.5 w-3.5" />
                  5 / 7 signals suspicious
                </div>
              </motion.div>

              {/* Evidence */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: 0.3, ease: EASE.out }}
                className="border-t border-[#eef1f6] p-6 md:border-l md:border-t-0"
              >
                <span className="landing-mono text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                  EVIDENCE TRAIL
                </span>
                <ul className="mt-4 space-y-3">
                  {EVIDENCE.map((row) => (
                    <li key={row.label}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">{row.label}</span>
                        <span className={cn("landing-mono font-bold", row.tone)}>{row.v}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#f1f3f7]">
                        <span className={cn("block h-full rounded-full", row.bar)} />
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Inspection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: 0.4, ease: EASE.out }}
                className="border-t border-[#eef1f6] p-6 md:border-l md:border-t-0"
              >
                <span className="landing-mono text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                  FRAME 01482 · INSPECTION
                </span>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { k: "FACE", v: "0.94" },
                    { k: "LEFT EYE", v: "0.81" },
                    { k: "MOUTH", v: "0.82" },
                    { k: "HAIR", v: "0.51" },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="rounded-md border border-[#eef1f6] bg-[#F7F8FA] p-2.5"
                    >
                      <p className="landing-mono text-[8px] font-semibold tracking-[0.14em] text-slate-400">
                        {row.k}
                      </p>
                      <p className="landing-mono mt-0.5 text-xs font-bold text-[#111827]">
                        {row.v}
                      </p>
                      <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-[#e5e7eb]">
                        <span
                          className="block h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.round(parseFloat(row.v) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-[#eef1f6] bg-gradient-to-r from-blue-50/60 to-violet-50/40 p-3">
                  <p className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Recommend human review before publication
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Status strip */}
            <div className="flex items-center justify-between border-t border-[#eef1f6] px-6 py-3">
              <span className="landing-mono flex items-center gap-2 text-[9px] font-semibold tracking-[0.16em] text-slate-400">
                <Radio className="h-3 w-3" />
                MULTI-SIGNAL FUSION · 7 DETECTORS
              </span>
              <span className="flex items-center gap-3 text-[10px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Encrypted · no retained media
                <span className="hidden items-center gap-1 font-medium text-blue-600 sm:flex">
                  Open case
                  <ArrowRight className="h-3 w-3" />
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}