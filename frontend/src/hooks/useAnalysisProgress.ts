"use client";

import { useEffect, useRef, useState } from "react";
import { ANALYSIS_STEPS, type AnalysisProgressEvent, api, USE_MOCKS_FLAG } from "@/lib/api";

type PipelineEvent = AnalysisProgressEvent;

export function useAnalysisProgress(
  active: boolean,
  durationMs = 8500,
  analysisId?: string
) {
  const [events, setEvents] = useState<PipelineEvent[]>(() =>
    ANALYSIS_STEPS.map((step) => ({ step, status: "pending", progress: 0 }))
  );
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(Math.round(durationMs / 1000));
  const [done, setDone] = useState(false);
  const stepIndex = useRef(-1);
  const doneRef = useRef(false);

  const useReal = !USE_MOCKS_FLAG && !!analysisId && active;

  useEffect(() => {
    if (!active) return;

    if (useReal) {
      let cancelled = false;
      const tick = async () => {
        if (cancelled || doneRef.current) return;
        try {
          const real = await api.getAnalysisProgress(analysisId!);
          if (cancelled) return;
          if (real.length === 0) return;
          const byStep = new Map(real.map((e) => [e.step, e]));
          const next = ANALYSIS_STEPS.map((step) => {
            const match = byStep.get(step);
            if (!match) return { step, status: "pending" as const, progress: 0 };
            return { step, status: match.status as "active" | "done", progress: match.progress };
          });
          setEvents(next);
          const maxProgress = Math.max(0, ...real.map((e) => e.progress));
          setProgress(Math.min(99, maxProgress));
          const allDone = real.length > 0 && real.every((e) => e.status === "done");
          if (allDone) {
            doneRef.current = true;
            clearInterval(timer);
            setProgress(100);
            setEta(0);
            setEvents(next.map((e) => ({ ...e, status: "done" })));
            setDone(true);
          }
        } catch {
          // fall back to simulated timeline on transient errors
        }
      };
      const timer = setInterval(() => void tick(), 900);
      void tick();
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }

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
  }, [active, durationMs, useReal, analysisId]);

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
