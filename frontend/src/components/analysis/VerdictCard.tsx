"use client";

import { motion } from "motion/react";
import { Download, Share2, FileSearch, ShieldAlert, Eye } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import { VERDICT_HEADLINES, VERDICT_LABELS } from "@/types/analysis";
import { Button } from "@/components/ui/button";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { toast } from "sonner";

const TONE: Record<
  AnalysisResult["verdict"],
  { border: string; text: string; bg: string; badge: string; rec: string }
> = {
  authentic: {
    border: "border-authentic/30",
    text: "text-authentic",
    bg: "bg-authentic-soft",
    badge: "border-authentic/20 bg-authentic-soft text-authentic",
    rec: "Human review not required",
  },
  suspicious: {
    border: "border-suspicious/30",
    text: "text-suspicious",
    bg: "bg-suspicious-soft",
    badge: "border-suspicious/25 bg-suspicious-soft text-suspicious",
    rec: "Human review recommended before use",
  },
  manipulated: {
    border: "border-manipulated/30",
    text: "text-manipulated",
    bg: "bg-manipulated-soft",
    badge: "border-manipulated/20 bg-manipulated-soft text-manipulated",
    rec: "Treat as manipulated until proven otherwise",
  },
  inconclusive: {
    border: "border-inconclusive/30",
    text: "text-inconclusive",
    bg: "bg-inconclusive-soft",
    badge: "border-inconclusive/20 bg-inconclusive-soft text-inconclusive",
    rec: "Additional source media recommended",
  },
};

export function VerdictCard({
  result,
  onViewEvidence,
}: {
  result: AnalysisResult;
  onViewEvidence?: () => void;
}) {
  const tone = TONE[result.verdict];
  const suspiciousCount = result.signals.filter((s) => s.severity === "high").length;
  const total = result.signals.length;

  const handleExport = () => {
    toast.success("Report export started", { description: "The PDF will be available shortly." });
  };

  return (
    <div className={`overflow-hidden rounded-xl border ${tone.border} bg-card shadow-xs`}>
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
        <ConfidenceGauge
          value={result.confidence}
          verdict={result.verdict}
          size={220}
          interval={result.confidenceInterval}
        />
        <div className="space-y-4">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}
            >
              <ShieldAlert className="h-3 w-3" />
              Final Assessment
            </span>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`mt-3 text-2xl font-semibold tracking-tight ${tone.text}`}
            >
              {VERDICT_HEADLINES[result.verdict]}
            </motion.h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {result.explanation}
            </p>
          </div>

          <p className="flex items-center gap-2 text-[13px] text-foreground">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{suspiciousCount} of {total}</span> forensic signals
            indicate anomalies
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Confidence
              </p>
              <p className="hex-mono font-semibold text-foreground">{result.confidence}%</p>
            </div>
            {result.confidenceInterval && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Confidence interval
                </p>
                <p className="hex-mono text-[13px] text-foreground tabular">
                  {result.confidenceInterval.lower}–{result.confidenceInterval.upper}%
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Verdict
              </p>
              <p className="text-[13px] font-medium capitalize text-foreground">
                {VERDICT_LABELS[result.verdict]}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={onViewEvidence}>
              <FileSearch className="h-3.5 w-3.5" />
              View Evidence
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Export Report
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toast.info("Share link copied to clipboard")}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Case
            </Button>
          </div>
        </div>
      </div>
      <div className={`border-t ${tone.border} ${tone.bg}/40 px-6 py-2.5`}>
        <p className={`flex items-center gap-1.5 text-xs font-medium ${tone.text}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {tone.rec}
        </p>
      </div>
    </div>
  );
}
