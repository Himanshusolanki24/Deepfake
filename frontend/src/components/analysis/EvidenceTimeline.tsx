"use client";

import { motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { TimelineEvent } from "@/types/analysis";
import { cn } from "@/lib/utils";

function EventIcon({ event }: { event: TimelineEvent }) {
  if (event.severity === "high") return <AlertTriangle className="h-3.5 w-3.5 text-manipulated" />;
  if (event.severity === "medium") return <AlertTriangle className="h-3.5 w-3.5 text-suspicious" />;
  if (event.title.startsWith("Final")) return <CheckCircle2 className="h-3.5 w-3.5 text-authentic" />;
  return <Info className="h-3.5 w-3.5 text-info" />;
}

export function EvidenceTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-0" aria-label="Evidence timeline">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-[9px] top-5 h-full w-px bg-border"
                aria-hidden="true"
              />
            )}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 300 }}
              className={cn(
                "relative z-10 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border bg-card shadow-sm",
                event.severity === "high"
                  ? "border-manipulated/30 text-manipulated"
                  : event.severity === "medium"
                    ? "border-suspicious/30 text-suspicious"
                    : "border-border text-muted-foreground"
              )}
            >
              <EventIcon event={event} />
            </motion.span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-foreground">{event.title}</p>
                <span className="hex-mono text-[10px] text-muted-foreground tabular">
                  {event.time}
                </span>
              </div>
              {event.detail && (
                <p className="hex-mono mt-0.5 truncate text-[11px] text-muted-foreground">
                  {event.detail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-[19px] w-[19px] animate-pulse rounded-full bg-secondary" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}
