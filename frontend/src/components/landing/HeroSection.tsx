"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForensicGrid } from "./ForensicGrid";
import { HeroForensicScanner } from "./HeroForensicScanner";
import { EASE } from "@/lib/animations/constants";

const HEADING_LINES = ["VERIFY", "WHAT YOU", "SEE."];

const tile = {
  hidden: { opacity: 0, y: 40, clipPath: "inset(0 0 100% 0)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    clipPath: "inset(0 0 0% 0)",
    transition: { duration: 0.85, delay: 0.5 + i * 0.1, ease: EASE.out },
  }),
};

function HeroWave() {
  return (
    <svg
      className="absolute bottom-0 left-0 h-[38%] w-full opacity-[0.05]"
      viewBox="0 0 1200 320"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {[0, 16, 32].map((n) => (
        <path
          key={n}
          d={`M0 ${160 + n} C 150 ${60 + n} 300 ${260 + n} 450 ${150 + n} S 750 ${40 + n} 900 ${170 + n} S 1100 ${280} 1200 ${120 + n}`}
          fill="none"
          stroke="#334155"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

export function HeroSection() {
  const reduced = useReducedMotion() ?? false;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTechnology = () => {
    document
      .querySelector("#technology")
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <section
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#F7F8FA]"
      aria-label="Introduction"
    >
      {/* Forensic substrate */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <div className="forensic-grid-fine landing-grid-mask absolute inset-0" />
        <ForensicGrid
          className="opacity-60"
          coords={[
            { x: "12%", y: "18%" },
            { x: "78%", y: "26%" },
            { x: "88%", y: "68%" },
            { x: "6%", y: "74%" },
          ]}
        />
        <HeroWave />
        <span className="landing-mono absolute right-6 top-28 hidden text-[10px] tracking-[0.18em] text-slate-400/70 lg:block">
          FRAME 01482 · X 0.742 · Y 0.381 · CONF 0.82
        </span>
        <span className="landing-mono absolute bottom-24 left-6 hidden text-[10px] tracking-[0.18em] text-slate-400/70 lg:block">
          SRC: UNKNOWN · CHANNEL: IMAGE/VIDEO/AUDIO
        </span>
      </motion.div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-10 px-5 pb-24 pt-32 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6 lg:pb-16 lg:pt-36">
        {/* Copy */}
        <div className="flex max-w-xl flex-col items-start justify-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE.out }}
            className="landing-mono flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500"
          >
            <span className="h-px w-8 bg-slate-400" aria-hidden="true" />
            Digital Media Forensics
          </motion.p>

          <h1 className="mt-6 select-none">
            {HEADING_LINES.map((line, i) => (
              <span key={line} className="block overflow-hidden pb-1">
                <motion.span
                  custom={i}
                  variants={tile}
                  initial="hidden"
                  animate="visible"
                  className="block text-[clamp(3rem,9vw,6.5rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-[#111827]"
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease: EASE.out }}
            className="mt-6 max-w-md text-pretty text-base leading-7 text-slate-500 sm:text-lg"
          >
            Multi-signal forensic analysis for images, video, and audio — with
            evidence you can inspect.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.05, ease: EASE.out }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg" className="group rounded-lg px-6">
              <Link href="/auth/login?next=/analyze">
                Analyze Media
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={scrollToTechnology}
              className="rounded-lg px-6"
            >
              Explore Technology
              <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </Button>
          </motion.div>
        </div>

        {/* Instrument */}
        <HeroForensicScanner />
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: scrolled ? 0 : 1 }}
        transition={{ duration: 0.5, delay: 2.4 }}
        className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        aria-hidden="true"
      >
        <span className="landing-mono flex flex-col items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.3em] text-slate-400">
          Scroll to investigate
          <motion.span
            animate={reduced ? { opacity: 0.5 } : { y: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </span>
      </motion.div>
    </section>
  );
}