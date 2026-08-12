"use client";

import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div className={cn("flex flex-col gap-5", centered && "items-center text-center", className)}>
      <Reveal>
        <p className="landing-mono flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          <span className="h-px w-8 bg-slate-400" aria-hidden="true" />
          {eyebrow}
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="text-balance text-4xl font-semibold leading-[1.06] tracking-[-0.025em] text-[#111827] sm:text-5xl lg:text-6xl">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.16}>
          <p
            className={cn(
              "max-w-2xl text-pretty text-base leading-7 text-slate-500 sm:text-lg",
              centered && "mx-auto"
            )}
          >
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}