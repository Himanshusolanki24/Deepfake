"use client";

import { motion } from "motion/react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { FaceMedia } from "./FaceMedia";
import { EASE } from "@/lib/animations/constants";

const SPECTRUM_D =
  "M0 118 C 30 112 46 120 62 114 C 80 108 92 122 108 116 C 124 110 138 118 156 112 C 174 106 190 122 208 116 C 226 110 240 120 258 114 C 276 108 292 116 310 96 C 326 78 336 62 350 54 C 366 46 384 60 400 76 C 416 92 428 100 440 108";

const AREA_D =
  "M0 118 C 30 112 46 120 62 114 C 80 108 92 122 108 116 C 124 110 138 118 156 112 C 174 106 190 122 208 116 C 226 110 240 120 258 114 C 276 108 292 116 310 96 C 326 78 336 62 350 54 C 366 46 384 60 400 76 C 416 92 428 100 440 108 L 440 200 L 0 200 Z";

export function FrequencySection() {
  return (
    <section className="relative overflow-hidden bg-[#F7F8FA] py-24 sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute left-[-12%] bottom-0 h-96 w-96 rounded-full bg-violet-50 blur-3xl" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Frequency-domain forensics"
          title={
            <>
              The artifacts
              <br />
              you can&rsquo;t see.
            </>
          }
          description={
            <>
              Generation pipelines leave traces in the frequency domain that
              are invisible to the eye — spectral energy where natural capture
              almost never produces it.
            </>
          }
        />

        <div className="mt-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
          {/* Media */}
          <Reveal>
            <div className="rounded-2xl border border-[#dbe2ec] bg-white p-2.5 shadow-[0_24px_60px_-24px_rgb(16_24_40/0.14)]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#eef1f6]">
                <FaceMedia className="h-full w-full" />
                <span className="landing-mono absolute right-3 top-3 rounded-sm bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.14em] text-slate-500 backdrop-blur" aria-hidden="true">
                  INPUT · RAW
                </span>
              </div>
            </div>
          </Reveal>

          {/* Spectrum */}
          <Reveal delay={0.15}>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_-24px_rgb(16_24_40/0.12)] sm:p-8">
              <div className="flex items-center justify-between">
                <span className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                  FFT MAGNITUDE SPECTRUM
                </span>
                <span className="landing-mono text-[10px] font-semibold tracking-[0.14em] text-amber-600">
                  LOG SCALE
                </span>
              </div>

              <div className="relative mt-5">
                <svg viewBox="0 0 440 200" className="w-full" role="img" aria-label="Frequency spectrum showing anomalous high-frequency energy">
                  {/* Grid */}
                  {[40, 80, 120, 160].map((y) => (
                    <line key={y} x1="0" y1={y} x2="440" y2={y} stroke="#eef1f6" strokeWidth="1" />
                  ))}
                  {[80, 170, 260, 350].map((x) => (
                    <line key={x} x1={x} y1="0" x2={x} y2="200" stroke="#eef1f6" strokeWidth="1" />
                  ))}

                  {/* Area */}
                  <motion.path
                    d={AREA_D}
                    fill="url(#fg-area)"
                    opacity={0.35}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 0.35 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 1.2, ease: EASE.out }}
                  />

                  {/* Baseline spectrum line */}
                  <motion.path
                    d={SPECTRUM_D}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 1.6, ease: EASE.out }}
                  />

                  {/* Anomaly band */}
                  <motion.g
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    <rect x="354" y="38" width="86" height="150" rx="4" fill="rgba(217,119,6,0.12)" />
                    <line x1="356" y1="40" x2="356" y2="186" stroke="rgba(217,119,6,0.6)" strokeWidth="1.5" strokeDasharray="4 4" />
                    {/* Anomalous spectral spike */}
                    <path
                      d="M354 118 C 358 70 366 40 378 40 C 390 40 398 66 402 96 C 404 106 408 110 430 112"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="animate-blink-soft"
                    />
                  </motion.g>

                  <defs>
                    <linearGradient id="fg-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#dbe7fe" />
                      <stop offset="1" stopColor="#ffffff" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Anomaly annotation */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.6, delay: 0.5, ease: EASE.out }}
                  className="landing-mono absolute -top-3 right-2 flex items-center gap-1.5 rounded-sm bg-amber-100 px-2 py-1 text-[9px] font-bold tracking-[0.14em] text-amber-700"
                  aria-hidden="true"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  ANOMALOUS HIGH-FREQUENCY ENERGY
                </motion.div>
              </div>

              {/* Axis */}
              <div className="mt-3 flex items-end justify-between px-1">
                <span className="landing-mono text-[9px] tracking-[0.14em] text-slate-400">
                  FREQ (Hz) →
                </span>
                <div className="flex gap-6">
                  {["0.1k", "1k", "10k", "50k"].map((t) => (
                    <span key={t} className="landing-mono text-[9px] tracking-[0.14em] text-slate-400">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-[#e5e7eb] bg-[#F7F8FA] px-2.5 py-1.5 text-[11px] font-medium text-slate-500">
                  Peak centered at 24.6 kHz band — outside organic capture envelope
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}