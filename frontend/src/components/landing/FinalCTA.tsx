"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { EASE } from "@/lib/animations/constants";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#F7F8FA] px-5 py-24 sm:px-8 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.9, ease: EASE.out }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#0b1322] px-6 py-20 text-center shadow-[0_40px_90px_-30px_rgb(11_19_34/0.6)] sm:px-12 sm:py-28"
      >
        {/* Forensic grid background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.18 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4 }}
            className="absolute inset-y-0 w-40 bg-gradient-to-r from-transparent via-white to-transparent animate-sweep-x"
          />
          <span className="landing-mono absolute left-6 top-6 text-[9px] tracking-[0.24em] text-white/30">
            FRAME 01482
          </span>
          <span className="landing-mono absolute right-6 top-6 text-[9px] tracking-[0.24em] text-white/30">
            X 0.742 · Y 0.381
          </span>
          <span className="landing-mono absolute bottom-6 left-6 text-[9px] tracking-[0.24em] text-white/25">
            MULTI-SIGNAL
          </span>
          <span className="landing-mono absolute bottom-6 right-6 text-[9px] tracking-[0.24em] text-white/25">
            CALIBRATED
          </span>
        </div>

        <div className="relative">
          <p className="landing-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Digital Media Forensics
          </p>
          <h2 className="mx-auto mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.02em] text-white sm:text-6xl">
            Ready to investigate?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-slate-300 sm:text-lg">
            Upload an image, video, or audio file and see the evidence behind
            its authenticity assessment.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/login?next=/analyze"
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0b1322] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Analyze Media
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}