"use client";

import { useRouter } from "next/navigation";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { VerdictCard } from "@/components/analysis/VerdictCard";
import { SignalBreakdown } from "@/components/analysis/SignalBreakdown";
import { MetadataPanel } from "@/components/forensic/MetadataPanel";
import { FrequencyChart } from "@/components/forensic/FrequencyChart";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatBytes, formatSeconds, timeAgo } from "@/lib/utils";
import { VERDICT_HEADLINES, VERDICT_LABELS } from "@/types/analysis";
import { MEDIA_TYPE_LABELS } from "@/types/media";
import { API_CONFIG } from "@/lib/api";

export function ReportView({ id }: { id: string }) {
  const router = useRouter();
  const { data: result, isLoading, isError, refetch } = useAnalysis(id);

  const handleDownloadPdf = async () => {
    if (API_CONFIG.useMocks) {
      toast.success("PDF report queued for download");
      return;
    }
    try {
      const res = await fetch(`${API_CONFIG.apiUrl}/api/v1/analysis/${id}/report/pdf`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "PDF generation failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `authentiq-report-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF report downloaded");
    } catch {
      toast.error("PDF report could not be generated", {
        description: "The report service is unavailable.",
      });
    }
  };

  if (isLoading) return <ReportSkeleton />;
  if (isError || !result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          title="Report unavailable"
          description="This report could not be generated. The analysis may have expired."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const meta = result.metadata;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDownloadPdf()}
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF Report
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            Print Report
          </Button>
        </div>
      </div>

      <article className="report-sheet space-y-8 rounded-lg border border-border bg-card p-6 shadow-sm sm:p-10">
        <header className="border-b border-border pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="hex-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                AUTHENTIQ · DIGITAL FORENSICS
              </p>
              <h1 className="mt-2 text-xl font-semibold text-foreground">
                Forensic Media Assessment Report
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Case <span className="hex-mono font-semibold text-foreground">{result.id}</span> ·{" "}
                {result.filename}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Generated
              </p>
              <p className="hex-mono text-xs text-foreground tabular">
                {new Date(result.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Report ID
              </p>
              <p className="hex-mono text-xs text-foreground">RPT-{result.id.replace("-2026-", "-")}</p>
            </div>
          </div>
        </header>

        <section aria-label="Assessment summary">
          <ReportSectionTitle index="1" title="Final Assessment" />
          <VerdictCard result={result} />
        </section>

        <section aria-label="Media information">
          <ReportSectionTitle index="2" title="Media Information" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border bg-muted/30 p-5 sm:grid-cols-4">
            <ReportField label="Case ID" value={result.id} mono />
            <ReportField label="Filename" value={result.filename} mono />
            <ReportField label="Media type" value={MEDIA_TYPE_LABELS[result.mediaType]} />
            <ReportField label="Verdict" value={VERDICT_LABELS[result.verdict]} />
            <ReportField label="Confidence" value={`${result.confidence}%`} mono />
            {result.confidenceInterval && (
              <ReportField
                label="Interval"
                value={`${result.confidenceInterval.lower}–${result.confidenceInterval.upper}%`}
                mono
              />
            )}
            <ReportField label="Size" value={meta ? formatBytes(meta.fileSize) : "—"} mono />
            <ReportField label="Duration" value={meta?.duration ? formatSeconds(meta.duration) : "—"} mono />
            <ReportField label="Analyzed" value={timeAgo(result.createdAt)} />
            <ReportField label="Engine" value="Forensic v2.4.1" mono />
          </div>
        </section>

        <section aria-label="Evidence breakdown">
          <ReportSectionTitle index="3" title="Evidence Breakdown" />
          <SignalBreakdown signals={result.signals} />
        </section>

        <section aria-label="Frequency analysis">
          <ReportSectionTitle index="4" title="Frequency-Domain Analysis" />
          {result.frequencyData ? (
            <FrequencyChart data={result.frequencyData} />
          ) : (
            <p className="text-sm text-muted-foreground">Not available for this media type.</p>
          )}
        </section>

        {result.suspiciousFrames && (
          <section aria-label="Suspicious frames">
            <ReportSectionTitle index="5" title="Suspicious Frames" />
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Frame</th>
                    <th className="px-4 py-2">Timestamp</th>
                    <th className="px-4 py-2">Score</th>
                    <th className="px-4 py-2">Finding</th>
                  </tr>
                </thead>
                <tbody>
                  {result.suspiciousFrames
                    .filter((f) => f.score >= 0.6)
                    .map((f) => (
                      <tr key={f.frame} className="border-t border-border">
                        <td className="hex-mono px-4 py-2.5 font-semibold">
                          {String(f.frame).padStart(4, "0")}
                        </td>
                        <td className="hex-mono px-4 py-2.5 text-muted-foreground tabular">
                          {formatSeconds(f.timestamp)}
                        </td>
                        <td className="hex-mono px-4 py-2.5 font-semibold text-manipulated">
                          {f.score.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{f.reason}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {result.metadata && (
          <section aria-label="Metadata">
            <ReportSectionTitle index="6" title="Metadata & Provenance" />
            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <MetadataPanel metadata={result.metadata} />
            </div>
          </section>
        )}

        <section aria-label="Methodology">
          <ReportSectionTitle index="7" title="Methodology" />
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 text-foreground/80">
            <li>Media is ingested and hashed for integrity verification.</li>
            <li>
              Independent signal detectors run over the media: spatial artifacts, frequency-domain
              analysis, temporal consistency, physiological proxies, audio-visual synchronization and
              metadata forensics.
            </li>
            <li>Each signal produces a calibrated suspicion score with confidence.</li>
            <li>Scores are fused via weighted calibration to produce the final confidence and verdict.</li>
          </ol>
        </section>

        <section aria-label="Limitations">
          <ReportSectionTitle index="8" title="Limitations" />
          <div className="rounded-lg border border-suspicious/20 bg-suspicious-soft p-4">
            <p className="text-sm leading-6 text-suspicious">
              This assessment is probabilistic and does not assert absolute certainty. High-confidence
              signals indicate manipulation <em>likely</em>; authentic verdicts indicate no consistent
              evidence of manipulation. Heavy recompression, low resolution or telephony-grade capture
              can mask or mimic forensic signals. Verdicts should be treated as investigative evidence
              requiring human review before publication or downstream use.
            </p>
          </div>
        </section>

        <footer className="border-t border-border pt-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            Generated by AUTHENTIQ Digital Forensics · Engine v2.4.1 · Verdict:{" "}
            {VERDICT_HEADLINES[result.verdict]}
          </p>
        </footer>
      </article>
    </div>
  );
}

function ReportSectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
      <Badge variant="secondary" className="rounded-sm px-1.5 py-0 text-[10px]">
        {index}
      </Badge>
      {title}
    </h2>
  );
}

function ReportField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "hex-mono truncate text-[13px] font-medium text-foreground"
            : "truncate text-[13px] font-medium text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-72 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
