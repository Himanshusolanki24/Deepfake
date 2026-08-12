"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef } from "react";
import { Check, Loader2, Circle, Timer, FileSearch, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalysisProgress, useLiveLog } from "@/hooks/useAnalysisProgress";
import { Progress } from "@/components/ui/progress";

const LIVE_LOG_LINES = [
  "[engine] analysis job registered · job_id=vid-2026-00182",
  "[ingest] stream decoded · container=mp4 codec=h264+aac",
  "[integrity] sha256 verified · 48,234,918 bytes ok",
  "[extract] 32 frames sampled across 4.2s window",
  "[detect] face found · alignment=frontal confidence=0.99",
  "[spatial] filtering artifacts · band=high-freq",
  "[spatial] blending seam candidate at jawline · score=0.81",
  "[freq] fft computed · window=256 hop=64",
  "[freq] anomalous energy in 28-44 Hz · deviation=2.1σ",
  "[temporal] optical flow mismatch · region=mouth",
  "[physio] rPPG proxy in range · pulse=71bpm",
  "[sync] a/v offset sampled · mean=184ms sd=22ms",
  "[meta] exif stripped · c2pa manifest absent",
  "[fusion] weighting applied · 6 signals · norm=L2",
  "[verdict] confidence calibrated · islr=0.87",
];

export function ProcessingPipeline({
  caseId,
  filename,
  active = true,
  onComplete,
  analysisId,
}: {
  caseId: string;
  filename: string;
  active?: boolean;
  onComplete?: () => void;
  analysisId?: string;
}) {
  const { events, progress, eta, done } = useAnalysisProgress(active, 8200, analysisId);
  const log = useLiveLog(LIVE_LOG_LINES, active, 540);
  const onCompleteRef = useRef(onComplete);
  const currentOp = events.find((e) => e.status === "active");

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => onCompleteRef.current?.(), 600);
      return () => clearTimeout(timer);
    }
  }, [done]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="hex-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Case <span className="text-foreground">{caseId}</span>
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">{filename}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
              done
                ? "border-authentic/20 bg-authentic-soft text-authentic"
                : "border-info/20 bg-info-soft text-info"
            )}
          >
            <Loader2 className={cn("h-3 w-3", !done && "animate-spin")} />
            {done ? "Analysis Complete" : "Analysis In Progress"}
          </span>
        </div>

        <div className="space-y-1">
          {events.map((e, i) => (
            <motion.div
              key={e.step}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-md px-2 py-1.5"
            >
              {e.status === "done" ? (
                <Check className="h-4 w-4 shrink-0 text-authentic" aria-hidden="true" />
              ) : e.status === "active" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-info" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-border" aria-hidden="true" />
              )}
              <span
                className={cn(
                  "text-[13px] font-medium",
                  e.status === "done" && "text-muted-foreground",
                  e.status === "active" && "text-foreground",
                  e.status === "pending" && "text-muted-foreground/50"
                )}
              >
                {e.step}
              </span>
              {e.status === "active" && (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-info">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />
                  processing
                </span>
              )}
              {e.status === "done" && (
                <span className="ml-auto text-[10px] text-authentic">verified</span>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              Estimated time remaining
            </span>
            <span className="hex-mono text-muted-foreground tabular">
              {done ? "0s" : `${eta}s`}
            </span>
          </div>
          <Progress
            value={progress}
            className="h-2"
            indicatorClassName={done ? "bg-authentic" : "bg-info"}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Pipeline progress</span>
            <span className="hex-mono tabular">{progress}%</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-info/15 bg-info-soft/60 px-3 py-2.5">
          <Activity className="h-3.5 w-3.5 shrink-0 animate-pulse text-info" />
          <p className="min-w-0 text-xs text-foreground">
            <span className="font-medium">Current operation</span>
            <span className="text-muted-foreground">
              {done ? " — rendering assessment" : currentOp ? ` — ${currentOp.step}…` : " — initializing engine…"}
            </span>
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-[#0b1322] shadow-xs">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-2.5">
          <FileSearch className="h-3.5 w-3.5 text-sidebar-muted" />
          <span className="hex-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
            Processing Log
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-authentic">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-authentic" />
            live
          </span>
        </div>
        <div className="h-44 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-6 dark-sidebar-scroll">
          <AnimatePresence initial={false}>
            {log.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="text-sidebar-muted"
              >
                <span className="mr-3 select-none text-sidebar-muted/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    line.includes("anomaly") || line.includes("anomalous") || line.includes("inconsistent")
                      ? "text-suspicious"
                      : line.includes("verified") || line.includes("ok")
                        ? "text-[#7fb4ff]"
                        : line.includes("verdict") || line.includes("calibrated")
                          ? "text-authentic"
                          : "text-[#c9d3e3]"
                  )}
                >
                  {line}
                </span>
              </motion.p>
            ))}
          </AnimatePresence>
          {done && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 flex items-center gap-2 text-authentic"
            >
              <Check className="h-3.5 w-3.5" />
              pipeline complete — rendering assessment
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
