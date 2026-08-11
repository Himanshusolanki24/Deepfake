"use client";

import { useRouter } from "next/navigation";
import { FileText, Download, Printer, ArrowRight, Calendar } from "lucide-react";
import { useHistory } from "@/hooks/useAnalysis";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";
import { VERDICT_LABELS } from "@/types/analysis";

export default function ReportsPage() {
  const router = useRouter();
  const { data: reports, isLoading, isError, refetch } = useHistory();

  if (isLoading) return <ReportsSkeleton />;
  if (isError || !reports) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          title="Unable to load reports"
          description="The reports service is temporarily unavailable."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Documentation"
        title="Reports"
        description="Generate and download professional forensic assessment reports for any completed case."
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No reports available"
          description="Run an analysis to generate its forensic assessment report."
          action={<Button onClick={() => router.push("/analyze")}>Analyze Media</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="group flex cursor-pointer flex-col rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:border-info/40 hover:shadow-md"
              onClick={() => router.push(`/analysis/${r.id}/report`)}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/analysis/${r.id}/report`)}
              role="link"
              aria-label={`Open report for case ${r.id}`}
            >
              <div className="flex items-center justify-between">
                <Badge variant="muted" className="hex-mono normal-case">{r.id}</Badge>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {timeAgo(r.createdAt)}
                </span>
              </div>
              <p className="mt-3 truncate text-sm font-medium text-foreground">{r.filename}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Verdict: <span className="font-medium capitalize">{VERDICT_LABELS[r.verdict]}</span> ·{" "}
                {r.confidence}% confidence
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.success(`Report ${r.id} queued for PDF download`);
                  }}
                >
                  <Download className="h-3 w-3" /> PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/analysis/${r.id}/report`, "_blank");
                  }}
                >
                  <Printer className="h-3 w-3" /> Print
                </Button>
                <span className="ml-auto flex items-center gap-1 text-[11px] text-info">
                  Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    </div>
  );
}
