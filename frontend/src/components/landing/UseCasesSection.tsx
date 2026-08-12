"use client";

import Link from "next/link";
import { Newspaper, ShieldCheck, Microscope, Code2, ArrowRight } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

const CASES = [
  {
    icon: Newspaper,
    title: "Journalists",
    body: "Verify media before publication.",
    detail: "Check the evidence behind any image or video before it reaches the front page.",
    href: "/analyze",
    cta: "Verify a file",
  },
  {
    icon: ShieldCheck,
    title: "Trust & Safety",
    body: "Investigate suspicious uploads.",
    detail: "Route flagged content through a repeatable, evidence-based assessment workflow.",
    href: "/analyze",
    cta: "Run an assessment",
  },
  {
    icon: Microscope,
    title: "Investigators",
    body: "Build evidence-backed assessments.",
    detail: "Export findings with attributed anomalies and calibrated confidence for review.",
    href: "/workspace",
    cta: "Open workspace",
  },
  {
    icon: Code2,
    title: "Developers",
    body: "Integrate authenticity analysis through API.",
    detail: "Send media, receive multi-signal results with evidence and calibration data.",
    href: "/api",
    cta: "Read the API docs",
  },
] as const;

export function UseCasesSection() {
  return (
    <section className="relative bg-white py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          align="center"
          eyebrow="Use cases"
          title="Built for people who must be sure."
        />
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CASES.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08} className="h-full">
              <div className="group flex h-full flex-col rounded-2xl border border-[#e5e7eb] bg-[#F7F8FA] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#d4dbe7] hover:shadow-[0_20px_50px_-24px_rgb(16_24_40/0.2)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#dbe2ec] bg-white text-blue-600 shadow-sm transition-colors group-hover:text-blue-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="mt-6 text-lg font-semibold tracking-tight text-[#111827]">
                  {item.title}
                </p>
                <p className="mt-1.5 text-sm font-medium text-slate-700">{item.body}</p>
                <p className="mt-3 flex-1 text-[13px] leading-6 text-slate-400">
                  {item.detail}
                </p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  {item.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}