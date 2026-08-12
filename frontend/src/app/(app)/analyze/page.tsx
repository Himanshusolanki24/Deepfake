"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Wand2,
  Lock,
  Check,
  Settings2,
  Upload,
  Radar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/page-header";
import { MediaDropzone, MediaFileChip, type UploadedEntry } from "@/components/upload/MediaDropzone";
import { MediaPreview } from "@/components/upload/MediaPreview";
import { ProcessingPipeline } from "@/components/analysis/ProcessingPipeline";
import { useAnalysisStore, type PendingEntry } from "@/store/analysisStore";
import { useStartAnalysis } from "@/hooks/useAnalysis";
import {
  DEFAULT_SIGNALS,
  AUDIO_SIGNALS,
  PRIVACY_COPY,
  SIGNAL_CATEGORIES,
  SIGNAL_TO_CATEGORY,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { DEMO_ANALYSES } from "@/mocks/analyses";

type Step = "upload" | "config" | "processing";

const ALL_SIGNALS = [...DEFAULT_SIGNALS, ...AUDIO_SIGNALS].map((s) => s.id);

const STEPS: { id: Step; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "upload", label: "Upload", description: "Select source media", icon: Upload },
  { id: "config", label: "Configure", description: "Choose detection signals", icon: Settings2 },
  { id: "processing", label: "Analyze", description: "Run forensic pipeline", icon: Radar },
];

export default function AnalyzePage() {
  const router = useRouter();
  const pendingEntries = useAnalysisStore((s) => s.pendingEntries);
  const setPendingEntries = useAnalysisStore((s) => s.setPendingEntries);
  const startAnalysis = useStartAnalysis();

  const [entries, setEntries] = useState<PendingEntry[]>(pendingEntries);
  const [step, setStep] = useState<Step>(pendingEntries.length ? "config" : "upload");
  const [signals, setSignals] = useState<string[]>(DEFAULT_SIGNALS.map((s) => s.id));
  const [caseId, setCaseId] = useState("");
  const [resultReady, setResultReady] = useState(false);

  const entry = entries[0];

  const isAudio = entry?.file.type === "audio";
  const availableSignals = useMemo(
    () => (isAudio ? [...DEFAULT_SIGNALS, ...AUDIO_SIGNALS] : DEFAULT_SIGNALS),
    [isAudio]
  );

  const groupedSignals = useMemo(() => {
    const groups = new Map<string, (typeof availableSignals)[number][]>();
    for (const signal of availableSignals) {
      const cat = SIGNAL_TO_CATEGORY[signal.id] ?? "visual";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(signal);
    }
    return [...groups.entries()].map(([cat, list]) => ({
      category: cat as keyof typeof SIGNAL_CATEGORIES,
      signals: list,
    }));
  }, [availableSignals]);

  const toggleSignal = (id: string) => {
    setSignals((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const onAccept = (accepted: UploadedEntry[]) => {
    const next = accepted.map((a) => ({ file: a.file, objectUrl: a.objectUrl }));
    setEntries(next);
    setPendingEntries([]);
    setStep("config");
  };

  const runAnalysis = async () => {
    if (!entry) return;
    setStep("processing");
    const result = await startAnalysis.mutateAsync({
      file: entry.file,
      signals: signals.length ? signals : ALL_SIGNALS,
    });
    setCaseId(result.id);
    setResultReady(true);
  };

  const goToResult = () => {
    if (caseId) router.push(`/analysis/${caseId}?fresh=1`);
  };

  const loadDemo = () => {
    const demo = DEMO_ANALYSES[0];
    setPendingEntries([]);
    router.push(`/analysis/${demo.id}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <AnimatePresence mode="wait">
        {step !== "processing" && (
          <motion.div key="header" exit={{ opacity: 0 }}>
            <PageHeader
              eyebrow="New Analysis"
              title="Forensic Analysis Workflow"
              description="Upload media, configure detection signals, and run a multi-signal authenticity assessment."
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Stepper step={step} />

      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            <MediaDropzone onFilesAccepted={onAccept} />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-xs">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-authentic" />
                {PRIVACY_COPY}
              </span>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadDemo}>
                <Wand2 className="h-4 w-4" />
                Load Demo Analysis
              </Button>
            </div>
          </motion.div>
        )}

        {step === "config" && entry && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Media preview
                  </p>
                  <MediaPreview entry={{ file: entry.file, blob: null as never, objectUrl: entry.objectUrl }} />
                  <div className="mt-3">
                    <MediaFileChip
                      entry={{ file: entry.file, blob: null as never, objectUrl: entry.objectUrl }}
                      index={0}
                      onRemove={() => {
                        setEntries([]);
                        setStep("upload");
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Analysis configuration</p>
                      <p className="text-xs text-muted-foreground">
                        Select forensic detection signals
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSignals(availableSignals.map((s) => s.id))}
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Recommended
                    </Button>
                  </div>
                  <Separator className="mb-4" />
                  <fieldset className="space-y-4">
                    <legend className="sr-only">Detection signals</legend>
                    {groupedSignals.map(({ category, signals: group }) => (
                      <div key={category}>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {SIGNAL_CATEGORIES[category].label}
                        </p>
                        <div className="space-y-2">
                          {group.map((signal) => (
                            <label
                              key={signal.id}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                                signals.includes(signal.id)
                                  ? "border-info/40 bg-info-soft/70"
                                  : "border-border hover:bg-accent"
                              )}
                            >
                              <Checkbox
                                checked={signals.includes(signal.id)}
                                onCheckedChange={() => toggleSignal(signal.id)}
                                className="mt-0.5"
                              />
                              <span className="flex flex-col gap-0.5">
                                <span className="text-[13px] font-medium text-foreground">
                                  {signal.label}
                                </span>
                                <span className="text-[11px] leading-5 text-muted-foreground">
                                  {signal.description}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </fieldset>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                  <Button className="ml-auto" onClick={() => void runAnalysis()}>
                    <Play className="h-4 w-4" />
                    Run Forensic Analysis
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === "processing" && entry && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <ProcessingPipeline
              caseId={caseId || "VID-2026-00XXX"}
              filename={entry.file.filename}
              active
              analysisId={caseId || undefined}
              onComplete={goToResult}
            />
            {resultReady && (
              <div className="flex justify-center">
                <Button onClick={goToResult}>
                  View Assessment
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center" aria-label="Analysis workflow">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
        return (
          <li key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-semibold transition-colors",
                    state === "done" && "border-authentic bg-authentic text-white",
                    state === "active" && "border-info bg-info text-white shadow-md shadow-info/20",
                    state === "todo" && "border-border bg-card text-muted-foreground"
                  )}
                  aria-current={state === "active" ? "step" : undefined}
                >
                  {state === "done" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:block",
                    state === "active" && "text-foreground",
                    state === "done" && "text-authentic",
                    state === "todo" && "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              <span
                className={cn(
                  "hidden text-[10px] text-muted-foreground sm:block",
                  state === "active" && "font-medium text-info"
                )}
              >
                {s.description}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "mx-3 mb-4 h-px w-8 sm:mx-4 sm:w-16",
                  i < activeIndex ? "bg-authentic" : "bg-border"
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
