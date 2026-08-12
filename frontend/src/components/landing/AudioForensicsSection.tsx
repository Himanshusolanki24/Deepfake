"use client";

import { motion } from "motion/react";
import { AudioLines, AlertTriangle } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { EASE } from "@/lib/animations/constants";

const WAVE_COUNT = 64;
const WAVE = Array.from({ length: WAVE_COUNT }, (_, i) => {
  const base =
    14 +
    12 * Math.abs(Math.sin(i * 0.47)) +
    9 * Math.abs(Math.cos(i * 0.23)) +
    (i > 38 && i < 46 ? 16 : 0);
  return Math.round(base);
});

const SPECTRUM_ROWS = 14;
const SPECTRUM_COLS = 48;

function hslToRgba(h: number, s: number, l: number, a: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const chroma = s * Math.min(l, 1 - l);
  const f = (n: number) => l - chroma * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (v: number) => Math.round(v * 255);
  return `rgba(${to(f(0))}, ${to(f(8))}, ${to(f(4))}, ${a.toFixed(3)})`;
}

const cells: { c: string }[] = [];
for (let r = 0; r < SPECTRUM_ROWS; r++) {
  for (let c = 0; c < SPECTRUM_COLS; c++) {
    const inAnom = c >= 29 && c <= 35;
    const seed = Math.abs(Math.sin(r * 7.3 + c * 3.1));
    const a = inAnom ? 0.35 + seed * 0.55 : 0.08 + seed * 0.4;
    const hue = inAnom ? 28 : 205;
    const light = Math.min(0.9, 60 - a * 35);
    cells.push({ c: hslToRgba(hue, 60, light, Math.min(0.9, a)) });
  }
}

const SUPERPHASE_D = "M0 40 C 60 36 80 52 120 48 C 160 44 176 30 220 34 C 264 38 280 52 320 50 C 360 48 380 40 440 44";

export function AudioForensicsSection() {
  return (
    <section className="relative overflow-hidden bg-[#F7F8FA] py-24 sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute right-[-10%] top-1/3 h-80 w-80 rounded-full bg-teal-50 blur-3xl" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Audio forensics"
          title={
            <>
              Hear what the
              <br />
              waveform reveals.
            </>
          }
          description={
            <>
              Synthetic speech leaves spectral fingerprints in the analysis —
              formant artefacts and banding a natural recording rarely shows.
            </>
          }
        />

        <Reveal delay={0.15}>
          <div className="mt-16 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_-24px_rgb(16_24_40/0.12)] sm:p-10">
            {/* Waveform */}
            <div className="flex items-center justify-between">
              <span className="landing-mono flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                <AudioLines className="h-3.5 w-3.5" />
                ADAPTIVE WAVEFORM
              </span>
              <span className="landing-mono text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                16 kHz · MONO
              </span>
            </div>

            <div className="relative mt-6">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.012 } } }}
                className="flex h-28 items-center justify-center gap-[2px]"
                aria-hidden="true"
              >
                {WAVE.map((h, i) => (
                  <motion.span
                    key={i}
                    variants={{
                      hidden: { scaleY: 0.12, opacity: 0.3 },
                      visible: {
                        scaleY: 1,
                        opacity: 1,
                        transition: { duration: 0.5, ease: EASE.out },
                      },
                    }}
                    style={{ height: h }}
                    className="w-[3px] origin-center rounded-full"
                  >
                    <span
                      className="block h-full w-full rounded-full"
                      style={{ backgroundColor: i > 38 && i < 46 ? "#d97706" : "#94a3b8" }}
                    />
                  </motion.span>
                ))}
              </motion.div>

              {/* Anomaly bracket */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="absolute -top-8 left-[60.7%] w-[11.6%] border-t-2 border-amber-500/70"
                aria-hidden="true"
              >
                <span className="landing-mono absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.12em] text-amber-700">
                  SPECTRAL ANOMALY 00:18.2 – 00:21.7
                </span>
                <span className="absolute -left-px top-0 h-2 w-0.5 bg-amber-500" />
                <span className="absolute -right-px top-0 h-2 w-0.5 bg-amber-500" />
              </motion.div>

              <div className="absolute inset-x-0 bottom-0 h-1">
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="pointer-events-none absolute inset-y-0 left-[60.7%] w-[11.6%] bg-amber-300/30"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-between">
              {["00:00", "00:15", "00:30"].map((t) => (
                <span key={t} className="landing-mono text-[9px] tracking-[0.14em] text-slate-400">
                  {t}
                </span>
              ))}
            </div>

            {/* Spectrogram */}
            <div className="mt-10">
              <p className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                SPECTROGRAM · RESIDUAL
              </p>
              <div className="mt-3 grid h-24 grid-cols-[repeat(48,minmax(0,1fr))] gap-[1.5px] overflow-hidden rounded-md bg-[#f6f7f9] p-[1.5px]">
                {cells.map((cell, i) => (
                  <span
                    key={i}
                    className="rounded-[1px]"
                    style={{ backgroundColor: cell.c }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-start justify-between">
                <span className="landing-mono text-[9px] tracking-[0.14em] text-slate-400">
                  BAND · HZ
                </span>
                <span className="landing-mono flex max-w-xs items-start gap-1.5 text-right text-[9px] leading-4 font-medium tracking-[0.08em] text-amber-600">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  VOCAL-TRACK BANDING &amp; FORMANT SPACING DEVIATION
                </span>
              </div>
            </div>

            {/* Pitch curve */}
            <div className="mt-8 rounded-lg border border-[#eef1f6] bg-[#F7F8FA] p-4">
              <div className="flex items-center justify-between">
                <span className="landing-mono text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                  PITCH TRACK
                </span>
                <span className="landing-mono text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                  F0 · HZ
                </span>
              </div>
              <svg viewBox="0 0 440 60" className="mt-3 w-full" aria-hidden="true">
                <motion.path
                  d={SUPERPHASE_D}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1.4, ease: EASE.out }}
                />
                <motion.line
                  x1="168"
                  y1="0"
                  x2="168"
                  y2="60"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  stroke="#d97706"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}