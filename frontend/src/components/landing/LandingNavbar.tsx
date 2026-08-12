"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Menu, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/animations/constants";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Technology", href: "#technology" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Research", href: "#research" },
] as const;

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = useCallback(
    (hash: string) => {
      setOpen(false);
      if (reduced) {
        document.querySelector(hash)?.scrollIntoView();
        return;
      }
      document
        .querySelector(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [reduced]
  );

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: EASE.out }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 sm:px-6"
    >
      <div
        className={cn(
          "flex w-full max-w-6xl items-center justify-between gap-4 transition-all duration-500",
          scrolled
            ? "mt-2.5 rounded-xl border border-border bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(16_24_40/0.06)]"
            : "mt-0 border border-transparent bg-transparent"
        )}
        style={{ padding: scrolled ? "10px 8px 10px 16px" : "18px 8px 18px 16px" }}
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })}
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="AUTHENTIQ — back to top"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e6ee] bg-white shadow-sm">
            <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[13px] font-semibold tracking-[0.18em] text-[#111827]">
              AUTHENTIQ
            </span>
            <span className="landing-mono mt-1 hidden text-[8px] font-medium uppercase tracking-[0.26em] text-slate-400 sm:block">
              Digital Media Forensics
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => scrollTo(link.href)}
              className="group relative rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#111827] focus-visible:outline-2 focus-visible:outline-ring"
            >
              {link.label}
              <span
                className="absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-[#111827]/70 transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden="true"
              />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            asChild
            className="hidden font-normal text-slate-600 hover:text-[#111827] sm:inline-flex"
          >
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="rounded-md px-4">
            <Link href="/auth/login?next=/analyze">
              Analyze Media
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE.out }}
            className="absolute inset-x-3 top-[calc(100%+8px)] rounded-xl border border-border bg-white/95 p-2 shadow-lg backdrop-blur-xl lg:hidden"
            aria-label="Mobile"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => scrollTo(link.href)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {link.label}
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
            ))}
            <Button asChild variant="ghost" className="mt-1 w-full justify-start text-slate-600">
              <Link href="/auth/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}