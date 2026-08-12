"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { EASE } from "@/lib/animations/constants";

export function ResponsibleAISection() {
  return (
    <section id="research" className="relative scroll-mt-24 overflow-hidden bg-white py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Responsible AI"
              title={
                <>
                  We quantify
                  <br />
                  uncertainty.
                </>
              }
              description={
                <>
                  No detector is permanently immune to new generation
                  techniques. AUTHENTIQ presents evidence and calibrated
                  confidence to support human decisions — not replace them.
                </>
              }
            />
            <Reveal delay={0.2}>
              <ul className="mt-8 space-y-3 text-[15px] leading-7 text-slate-500">
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563eb]" />
                  Confidence intervals are calibrated — they mean what they claim.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d97706]" />
                  Inconclusive signals are reported as inconclusive, never as clean.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#16a34a]" />
                  The evidence trail stays visible for every decision.
                </li>
              </ul>
            </Reveal>
          </div>

          <div className="rounded-2xl border border-[#e5e7eb] bg-[#F7F8FA] p-8 sm:p-10">
            <div className="flex items-center justify-between">
              <p className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                CONFIDENCE
              </p>
              <p className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                NOT
              </p>
              <p className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                CERTAINTY
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, ease: EASE.out }}
                className="text-6xl font-bold tracking-tight text-[#111827] sm:text-7xl"
              >
                <AnimatedNumber value={87} suffix="%" />
              </motion.p>
              <span
                className="landing-mono text-3xl font-bold text-slate-300"
                aria-hidden="true"
              >
                ≠
              </span>
              <span className="text-6xl font-bold tracking-tight text-slate-200 sm:text-7xl">
                100%
              </span>
            </div>
            <div className="mt-6 flex items-center justify-between text-[11px] text-slate-400">
              <span>human in the loop</span>
              <span>never a black box</span>
            </div>

            <div className="mt-8 rounded-lg border border-[#e5e7eb] bg-white p-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-600">Recommendation</span>
                <span className="landing-mono font-semibold text-amber-600">
                  HUMAN REVIEW
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>SPATIAL — STRONG</span>
                  <span className="landing-mono">0.81</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>PROVENANCE — INCONCLUSIVE</span>
                  <span className="landing-mono">—</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}