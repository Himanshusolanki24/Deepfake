"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ScanSearch, Fingerprint } from "lucide-react";
import type { SignalResult } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { SeverityPill } from "@/components/common/badges";
import {
  SIGNAL_CATEGORIES,
  SIGNAL_TO_CATEGORY,
  type SignalCategory,
} from "@/lib/constants";

function scoreTone(score: number): string {
  if (score >= 0.7) return "var(--color-manipulated)";
  if (score >= 0.45) return "var(--color-suspicious)";
  return "var(--color-authentic)";
}

function scoreLabel(score: number): string {
  if (score >= 0.7) return "SUSPICIOUS";
  if (score >= 0.45) return "MODERATE";
  return "LOW CONCERN";
}

export function SignalCard({ signal, index }: { signal: SignalResult; index: number }) {
  const [open, setOpen] = useState(false);
  const color = scoreTone(signal.score);
  const hasTechnical = !!signal.technical?.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.35 }}
      className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
    >
      <div className="flex items-start gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{signal.name}</p>
            <SeverityPill severity={signal.severity} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hex-mono text-2xl font-semibold tabular" style={{ color }}>
              {signal.score.toFixed(2)}
            </span>
            <span
              className="hex-mono text-[10px] font-semibold uppercase tracking-wider"
              style={{ color }}
            >
              {scoreLabel(signal.score)}
            </span>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{signal.explanation}</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={!hasTechnical}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors",
            hasTechnical
              ? "hover:bg-accent hover:text-foreground"
              : "cursor-default opacity-40"
          )}
          aria-expanded={open}
          aria-controls={`signal-details-${signal.id}`}
        >
          <ScanSearch className="h-3.5 w-3.5" />
          Details
          {hasTechnical && (
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            />
          )}
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center gap-3">
          <Progress
            value={signal.score * 100}
            className="h-1.5 flex-1"
            indicatorClassName="transition-all duration-700"
            fill={color}
          />
          <span className="hex-mono text-[10px] text-muted-foreground tabular">
            conf. {Math.round(signal.confidence * 100)}%
          </span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && hasTechnical && (
          <motion.div
            id={`signal-details-${signal.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="border-t border-border bg-muted/40 px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Technical details
              </p>
              <ul className="space-y-1.5">
                {signal.technical!.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-5 text-foreground/80">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-info" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const CATEGORY_ORDER: SignalCategory[] = [
  "visual",
  "temporal",
  "audio",
  "crossmodal",
  "provenance",
];

export function SignalBreakdown({ signals }: { signals: SignalResult[] }) {
  const grouped = new Map<SignalCategory, SignalResult[]>();
  signals.forEach((signal) => {
    const category = SIGNAL_TO_CATEGORY[signal.id] ?? "visual";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(signal);
  });

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((category) => {
        const list = grouped.get(category)!;
        const meta = SIGNAL_CATEGORIES[category];
        return (
          <section key={category} aria-labelledby={`category-${category}`}>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground">
                <Fingerprint className="h-3.5 w-3.5" />
              </span>
              <div>
                <h3
                  id={`category-${category}`}
                  className="text-[13px] font-semibold text-foreground"
                >
                  {meta.label}
                </h3>
                <p className="text-[11px] text-muted-foreground">{meta.description}</p>
              </div>
              <span className="ml-auto hidden text-[11px] text-muted-foreground sm:block">
                {list.length} signal{list.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {list.map((signal, i) => (
                <SignalCard key={signal.id} signal={signal} index={i} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
