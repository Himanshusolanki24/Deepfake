"use client";

import { motion } from "motion/react";
import { SectionHeading } from "./SectionHeading";
import { EASE } from "@/lib/animations/constants";

const TECH = [
  {
    n: "01",
    signal: "Spatial Analysis",
    detail: "Transfer-learned CNN over image patches",
    chips: ["CNNs", "Imagenet-pretrained", "Texture"],
  },
  {
    n: "02",
    signal: "Frequency Forensics",
    detail: "Spectral energy in the FFT / DCT domain",
    chips: ["FFT", "DCT", "High-freq trace"],
  },
  {
    n: "03",
    signal: "Temporal Analysis",
    detail: "Face landmarks and optical flow across frames",
    chips: ["Landmarks", "Optical flow", "Coherence"],
  },
  {
    n: "04",
    signal: "Audio Analysis",
    detail: "Spectrogram residuals and prosody cues",
    chips: ["Spectrogram", "F0 track", "Banding"],
  },
  {
    n: "05",
    signal: "Provenance",
    detail: "EXIF and C2PA content credentials parsing",
    chips: ["EXIF", "C2PA", "Hashes"],
  },
  {
    n: "06",
    signal: "Evidence Fusion",
    detail: "Calibrated meta-classifier over signal outputs",
    chips: ["Calibration", "Meta-ensemble", "Uncertainty"],
  },
] as const;

export function TechnologySection() {
  return (
    <section id="technology" className="relative scroll-mt-24 overflow-hidden bg-[#F7F8FA] py-24 sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="forensic-grid-fine landing-grid-mask absolute inset-0 opacity-50" />
      </div>
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Technical credibility"
          title={
            <>
              Built on multiple
              <br />
              independent signals.
            </>
          }
          description={
            <>
              No single network decides the outcome. Independent detection
              signals feed a calibrated fusion layer that reports its own
              uncertainty.
            </>
          }
        />

        <div className="mt-16 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_24px_60px_-28px_rgb(16_24_40/0.14)]">
          {TECH.map((item, i) => (
            <motion.div
              key={item.signal}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.05, ease: EASE.out }}
              className={`flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-8 sm:px-8 ${
                i !== TECH.length - 1 ? "border-b border-[#eef1f6]" : ""
              }`}
            >
              <span className="landing-mono text-xs font-bold text-slate-300">
                {item.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold tracking-tight text-[#111827]">
                  {item.signal}
                </p>
                <p className="mt-1 hidden text-sm text-slate-400 sm:block">
                  {item.detail}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.chips.map((chip) => (
                  <span
                    key={chip}
                    className="landing-mono rounded-md border border-[#e5e7eb] bg-[#F7F8FA] px-2 py-1 text-[9px] font-semibold tracking-[0.12em] text-slate-500"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}