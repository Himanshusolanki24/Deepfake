"use client";

import { useEffect, useRef, useState } from "react";
import { ANALYSIS_STEPS, type AnalysisProgressEvent } from "@/lib/api";

type PipelineEvent = AnalysisProgressEvent;

export function useAnalysisProgress(active: boolean, durationMs = 8500) {
  const [events, setEvents] = useState<PipelineEvent[]>(() =>
    ANALYSIS_STEPS.map((step) => ({ step, status: "pending", progress: 0 }))
  );
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(Math.round(durationMs / 1000));
  const [done, setDone] = useState(false);
  const stepIndex = useRef(-1);

  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(99, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);
      setEta(Math.max(1, Math.ceil((durationMs - elapsed) / 1000)));

      const newIndex = Math.min(
        ANALYSIS_STEPS.length - 1,
        Math.floor((elapsed / durationMs) * ANALYSIS_STEPS.length)
      );
      if (newIndex !== stepIndex.current) {
        stepIndex.current = newIndex;
        setEvents((prev) =>
          prev.map((e, i) =>
            i < newIndex
              ? { ...e, status: "done" }
              : i === newIndex
                ? { ...e, status: "active" }
                : { ...e, status: "pending" }
          )
        );
      }

      if (elapsed >= durationMs) {
        clearInterval(timer);
        setProgress(100);
        setEta(0);
        setEvents((prev) => prev.map((e) => ({ ...e, status: "done" })));
        setDone(true);
      }
    }, 120);
    return () => clearInterval(timer);
  }, [active, durationMs]);

  return { events, progress, eta, done };
}

export function useLiveLog(lines: string[], active: boolean, intervalMs = 700) {
  const [visible, setVisibleState] = useState(0);
  if (!active && visible !== 0) {
    setVisibleState(0);
  }
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setVisibleState((v) => {
        if (v >= lines.length) {
          clearInterval(timer);
          return v;
        }
        return v + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [active, lines.length, intervalMs]);
  return lines.slice(0, visible);
}
