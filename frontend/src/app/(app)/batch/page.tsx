"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  Play,
  Trash2,
  CheckCircle2,
  Loader2,
  Clock,
  AlertTriangle,
  FileImage,
  FileVideo,
  FileAudio,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { MediaDropzone, type UploadedEntry } from "@/components/upload/MediaDropzone";
import { useGenerateBatchResult } from "@/hooks/useAnalysis";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AnalysisResult, Verdict } from "@/types/analysis";
import { DEFAULT_SIGNALS } from "@/lib/constants";

interface QueueItem {
  key: string;
  file: UploadedEntry["file"];
  objectUrl: string;
  status: "queued" | "processing" | "complete";
  result?: AnalysisResult;
}

export default function BatchPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const generate = useGenerateBatchResult();

  const onAccept = (entries: UploadedEntry[]) => {
    const next = entries.map((e) => ({
      key: e.file.id,
      file: e.file,
      objectUrl: e.objectUrl,
      status: "queued" as const,
    }));
    setQueue((prev) => [...prev, ...next]);
    toast.success(`${next.length} file${next.length > 1 ? "s" : ""} added to queue`);
  };

  const removeItem = (key: string) => {
    setQueue((prev) => prev.filter((q) => q.key !== key));
  };

  const runBatch = async () => {
    if (!queue.length) return;
    setRunning(true);
    for (const item of queue) {
      if (item.status === "complete") continue;
      setQueue((prev) => prev.map((q) => (q.key === item.key ? { ...q, status: "processing" } : q)));
      const res = await generate.mutateAsync({ file: item.file, signals: DEFAULT_SIGNALS.map((s) => s.id) });
      setQueue((prev) =>
        prev.map((q) =>
          q.key === item.key
            ? { ...q, status: "complete", result: res.result }
            : q
        )
      );
    }
    setRunning(false);
    toast.success("Batch analysis complete");
  };

  const summary = useMemo(() => {
    const done = queue.filter((q) => q.status === "complete");
    const counts: Record<Verdict, number> = {
      authentic: 0,
      suspicious: 0,
      manipulated: 0,
      inconclusive: 0,
    };
    done.forEach((q) => {
      if (q.result) counts[q.result.verdict] += 1;
    });
    return {
      total: queue.length,
      completed: done.length,
      authentic: counts.authentic,
      suspicious: counts.suspicious,
      manipulated: counts.manipulated,
      inconclusive: counts.inconclusive,
    };
  }, [queue]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Batch Processing"
        title="Batch Analysis"
        description="Upload multiple media files and run authenticity assessments as a queue."
        actions={
          <Button onClick={() => void runBatch()} disabled={running || queue.length === 0}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running…" : "Run Batch"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Add media to queue</CardTitle>
              <CardDescription className="text-xs">Drag & drop multiple files, or browse.</CardDescription>
            </CardHeader>
            <CardContent>
              <MediaDropzone onFilesAccepted={onAccept} multiple maxFiles={20} compact />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Processing queue</CardTitle>
                <CardDescription className="text-xs">
                  {queue.length === 0 ? "No files staged" : `${queue.length} file${queue.length === 1 ? "" : "s"} staged`}
                </CardDescription>
              </div>
              {queue.length > 0 && (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setQueue([])}>
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                  No files in queue yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {queue.map((item, i) => (
                      <motion.li
                        key={item.key}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 shadow-xs"
                      >
                        <span className="hex-mono text-[10px] font-medium text-muted-foreground tabular">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <QueueIcon type={item.file.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-foreground">{item.file.filename}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.status === "processing" && "Extracting frames · verifying integrity"}
                            {item.status === "queued" && "Queued for analysis"}
                            {item.status === "complete" && item.result && `${item.result.confidence}% confidence · ${item.result.verdict}`}
                          </p>
                        </div>
                        <QueueStatus status={item.status} verdict={item.result?.verdict} />
                        <button
                          onClick={() => removeItem(item.key)}
                          disabled={item.status === "processing"}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-manipulated disabled:opacity-30"
                          aria-label={`Remove ${item.file.filename}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-info" />
                Batch summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="Total files" value={summary.total} icon={<UploadCloud className="h-3.5 w-3.5" />} />
              <SummaryRow label="Completed" value={summary.completed} icon={<CheckCircle2 className="h-3.5 w-3.5 text-authentic" />} />
              <SummaryRow label="Authentic" value={summary.authentic} icon={<CheckCircle2 className="h-3.5 w-3.5 text-authentic" />} />
              <SummaryRow label="Suspicious" value={summary.suspicious} icon={<AlertTriangle className="h-3.5 w-3.5 text-suspicious" />} />
              <SummaryRow label="Manipulated" value={summary.manipulated} icon={<AlertTriangle className="h-3.5 w-3.5 text-manipulated" />} />
              <SummaryRow label="Inconclusive" value={summary.inconclusive} icon={<Clock className="h-3.5 w-3.5 text-inconclusive" />} />
            </CardContent>
          </Card>

          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              Queue progress
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-info to-authentic"
                animate={{ width: `${summary.total ? (summary.completed / summary.total) * 100 : 0}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground tabular">
              {summary.completed} of {summary.total} files analyzed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueIcon({ type }: { type: "image" | "video" | "audio" }) {
  const Icon = type === "video" ? FileVideo : type === "audio" ? FileAudio : FileImage;
  return <Icon className="h-4 w-4" />;
}

function QueueStatus({ status, verdict }: { status: QueueItem["status"]; verdict?: Verdict }) {
  if (status === "processing")
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-info">
        <Loader2 className="h-3 w-3 animate-spin" /> Processing
      </span>
    );
  if (status === "complete" && verdict) {
    const tone =
      verdict === "authentic"
        ? "text-authentic"
        : verdict === "suspicious"
          ? "text-suspicious"
          : verdict === "manipulated"
            ? "text-manipulated"
            : "text-inconclusive";
    return (
      <span className={cn("flex items-center gap-1 text-[11px] font-semibold", tone)}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Clock className="h-3 w-3" /> Queued
    </span>
  );
}

function SummaryRow({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
      <span className="hex-mono font-semibold tabular text-foreground">{value}</span>
    </div>
  );
}
