"use client";

import { motion } from "motion/react";
import { FileDigit, Hash, FileX, CircleX } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { EASE } from "@/lib/animations/constants";
import { cn } from "@/lib/utils";

const CHAIN = [
  { label: "CAPTURE", detail: "Device · sensor · timestamp" },
  { label: "EDIT", detail: "Toolchain · history · assets" },
  { label: "EXPORT", detail: "Codec · container · hashes" },
  { label: "UPLOAD", detail: "Platform · channel · ingest" },
] as const;

const FACTS = [
  { icon: FileDigit, label: "EXIF / IPTC", status: "MINIMAL", ok: true, note: "Software field stripped" },
  { icon: FileX, label: "C2PA CONTENT CREDENTIALS", status: "NOT PRESENT", ok: false, note: "No manifest detected" },
  { icon: Hash, label: "FILE HASH", status: "PRESENT", ok: true, note: "SHA-256 verified stable" },
  { icon: CircleX, label: "TIMESTAMP", status: "GDP", ok: false, note: "No trust anchor" },
] as const;

export function ProvenanceSection() {
  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Provenance"
          title={
            <>
              Where did this media
              <br />
              actually come from?
            </>
          }
          description={
            <>
              AUTHENTIQ reconstructs the edit chain from embedded provenance —
              and is explicit when that chain is missing.
            </>
          }
        />

        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Chain */}
          <div>
            <Reveal>
              <p className="landing-mono mb-8 flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                <Hash className="h-3.5 w-3.5" />
                RECONSTRUCTED CHAIN
              </p>
            </Reveal>
            <div className="relative">
              <motion.span
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 1.2, ease: EASE.out }}
                className="absolute left-[13px] top-2 bottom-2 w-px origin-top bg-[linear-gradient(to_bottom,#cbd5e1,#e2e8f0)]"
                aria-hidden="true"
              />
              <ul className="space-y-8">
                {CHAIN.map((step, i) => (
                  <li key={step.label} className="relative flex items-center gap-5">
                    <Reveal delay={i * 0.12}>
                      <span className="landing-mono relative z-10 flex h-7 w-7 items-center justify-center rounded-md border border-[#dbe2ec] bg-white text-[9px] font-bold text-blue-600 shadow-sm">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </Reveal>
                    <Reveal delay={i * 0.12 + 0.05}>
                      <div>
                        <p className="text-sm font-semibold tracking-[0.1em] text-[#111827]">
                          {step.label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">{step.detail}</p>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Facts */}
          <div>
            <Reveal>
              <p className="landing-mono mb-8 flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                PARSED METADATA FIELD BY FIELD
              </p>
            </Reveal>
            <div className="space-y-3">
              {FACTS.map((fact, i) => (
                <Reveal key={fact.label} delay={i * 0.08}>
                  <div className="flex items-center gap-4 rounded-xl border border-[#e5e7eb] bg-[#F7F8FA] p-4">
                    <fact.icon className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#111827]">
                        {fact.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{fact.note}</p>
                    </div>
                    <span
                      className={cn(
                        "landing-mono rounded-md px-2 py-1 text-[9px] font-bold tracking-[0.14em]",
                        fact.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      )}
                    >
                      {fact.status}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.2}>
              <div className="mt-6 rounded-xl border border-amber-200/70 bg-amber-50/50 p-4">
                <p className="landing-mono text-[9px] font-bold tracking-[0.16em] text-amber-700">
                  CONTENT CREDENTIALS — NOT PRESENT
                </p>
                <p className="mt-2 text-[13px] leading-6 text-slate-600">
                  Missing metadata is not proof of manipulation. Provenance is
                  only ever one signal — presented, never overstated.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}