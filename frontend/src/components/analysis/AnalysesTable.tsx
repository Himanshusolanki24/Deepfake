"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { FileVideo, FileAudio, FileImage, ChevronRight } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import { VERDICT_TO_RISK, VERDICT_LABELS } from "@/types/analysis";
import { MEDIA_TYPE_LABELS } from "@/types/media";
import { timeAgo } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerdictBadge, StatusBadge } from "@/components/common/badges";
import { cn } from "@/lib/utils";

function MediaIcon({ type }: { type: AnalysisResult["mediaType"] }) {
  const Icon = type === "video" ? FileVideo : type === "audio" ? FileAudio : FileImage;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );
}

function RiskIndicator({ result }: { result: AnalysisResult }) {
  const risk = VERDICT_TO_RISK[result.verdict];
  const tone =
    risk === "high"
      ? "text-manipulated"
      : risk === "medium"
        ? "text-suspicious"
        : "text-authentic";
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {risk === "high" ? "High" : risk === "medium" ? "Medium" : "Low"}
    </span>
  );
}

export function AnalysesTable({
  analyses,
  onRowClick,
  dense = false,
}: {
  analyses: AnalysisResult[];
  onRowClick?: (analysis: AnalysisResult) => void;
  dense?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Case ID</TableHead>
            <TableHead>Media</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Result</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Analyzed</TableHead>
            <TableHead>Status</TableHead>
            {!dense && <TableHead className="w-8" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {analyses.map((analysis, i) => (
            <motion.tr
              key={analysis.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              onClick={() => onRowClick?.(analysis)}
              className={cn(
                "group cursor-pointer border-b border-border last:border-0",
                onRowClick && "hover:bg-accent/60"
              )}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" && onRowClick) onRowClick(analysis);
              }}
              aria-label={`Open analysis ${analysis.id}`}
            >
              <TableCell className="pl-4">
                <Link
                  href={`/analysis/${analysis.id}`}
                  className="hex-mono text-[13px] font-semibold text-info hover:underline"
                  onClick={(e) => {
                    if (onRowClick) e.preventDefault();
                  }}
                >
                  {analysis.id}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <MediaIcon type={analysis.mediaType} />
                  <span className="max-w-[220px] truncate text-[13px] font-medium text-foreground">
                    {analysis.filename}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium text-muted-foreground">
                  {MEDIA_TYPE_LABELS[analysis.mediaType]}
                </span>
              </TableCell>
              <TableCell>
                <VerdictBadge verdict={analysis.verdict} />
              </TableCell>
              <TableCell className="text-right">
                <span className="hex-mono text-[13px] font-semibold tabular text-foreground">
                  {analysis.confidence}%
                </span>
              </TableCell>
              <TableCell>
                <RiskIndicator result={analysis} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular">
                {timeAgo(analysis.createdAt)}
              </TableCell>
              <TableCell>
                <StatusBadge status={analysis.status} />
              </TableCell>
              {!dense && (
                <TableCell className="pr-4">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </TableCell>
              )}
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AnalysesTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/40 px-4 py-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
          <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
          <div className="h-8 w-8 animate-pulse rounded-md bg-secondary" />
          <div className="h-3 w-40 animate-pulse rounded bg-secondary" />
          <div className="ml-auto h-3 w-16 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}

export { VERDICT_LABELS };
