"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FileText, Download, Clock3, Cpu, Waves, ShieldCheck } from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { AnalysisCaseHeader } from "@/components/layout/Header";
import { VerdictCard } from "./VerdictCard";
import { SignalBreakdown } from "./SignalBreakdown";
import { EvidenceTimeline } from "./EvidenceTimeline";
import { HeatmapViewer } from "@/components/forensic/HeatmapViewer";
import { FrequencyChart } from "@/components/forensic/FrequencyChart";
import { MetadataPanel } from "@/components/forensic/MetadataPanel";
import { FrameInvestigation } from "@/components/forensic/FrameInvestigation";
import { AudioForensics } from "@/components/forensic/AudioForensics";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Section({
  id,
  index,
  title,
  description,
  children,
}: {
  id: string;
  index: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div className="flex items-center gap-3">
        <span className="hex-mono flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-card text-[10px] font-semibold text-muted-foreground">
          {index}
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function AnalysisDetailView({ id }: { id: string }) {
  const { data: result, isLoading, isError, refetch } = useAnalysis(id);
  const startRef = useRef<HTMLDivElement>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  if (isLoading) return <AnalysisDetailSkeleton />;
  if (isError || !result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          title="Analysis not found"
          description="The requested case could not be retrieved. It may have expired or the analysis service is temporarily unavailable."
          onRetry={() => void refetch()}
        />
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isVideo = result.mediaType === "video";
  const isAudio = result.mediaType === "audio";
  const isImage = result.mediaType === "image";
  const duration = result.metadata?.duration ?? 31;

  const navItems = [
    { id: "assessment", label: "Assessment" },
    { id: "investigation", label: "Investigation" },
    { id: "evidence", label: "Evidence" },
    { id: "frequency", label: "Frequency" },
    { id: "metadata", label: "Metadata" },
    { id: "timeline", label: "Timeline" },
  ];

  const handleDownload = () => {
    toast.success("Report export started", { description: `Case ${result.id} report queued as PDF.` });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4">
        <AnalysisCaseHeader id={result.id} status={result.status} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Authenticity Assessment</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {result.filename} · {result.confidence}% calibrated confidence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Link href={`/analysis/${result.id}/report`}>
              <Button size="sm">
                <FileText className="h-3.5 w-3.5" />
                View Report
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <nav
        className="sticky top-16 z-30 -mx-4 flex gap-1 overflow-x-auto border-y border-border bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0"
        aria-label="Investigation sections"
      >
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="rounded-md px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div ref={startRef} className="space-y-10">
        <Section id="assessment" index="01" title="Final Assessment" description="Calibrated authenticity verdict with calibrated confidence interval.">
          <VerdictCard result={result} onViewEvidence={() => setEvidenceOpen(true)} />
        </Section>

        <Section
          id="investigation"
          index="02"
          title="Media Investigation"
          description={isVideo ? "Video inspection with per-frame suspicion scores." : isAudio ? "Audio forensic analysis with waveform and spectrogram evidence." : "Image inspection with Grad-CAM style attention heatmaps."}
        >
          {isImage && result.heatmapRegions && (
            <HeatmapViewer regions={result.heatmapRegions} filename={result.filename} />
          )}
          {isVideo && result.suspiciousFrames && (
            <FrameInvestigation filename={result.filename} frames={result.suspiciousFrames} duration={duration} />
          )}
          {isAudio && <AudioForensics result={result} />}
        </Section>

        <Section id="evidence" index="03" title="Evidence Breakdown" description="Independent forensic signals with scores, severity and technical detail.">
          <SignalBreakdown signals={result.signals} />
        </Section>

        <Section id="frequency" index="04" title="Frequency-Domain Analysis" description="Spectral evidence with anomaly zones against the natural baseline.">
          {result.frequencyData ? (
            <FrequencyChart data={result.frequencyData} />
          ) : (
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              Frequency-domain data is not available for this media type.
            </div>
          )}
        </Section>

        <Section id="metadata" index="05" title="Metadata & Provenance" description="File provenance, edit chain and content credential status.">
          {result.metadata ? (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <MetadataPanel metadata={result.metadata} />
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              Metadata was not extracted for this case.
            </div>
          )}
        </Section>

        <Section id="timeline" index="06" title="Evidence Timeline" description="Chronological sequence of forensic events during processing.">
          {result.timeline ? (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <EvidenceTimeline events={result.timeline} />
            </div>
          ) : null}
        </Section>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm"
        >
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Processing time: {result.processingTime ?? "—"}s
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" />
            Engine v2.4.1
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Waves className="h-3.5 w-3.5" />
            {result.signals.length} signals fused
          </span>
          <span className={cn("ml-auto flex items-center gap-2 text-xs font-medium", result.verdict === "authentic" ? "text-authentic" : result.verdict === "suspicious" ? "text-suspicious" : result.verdict === "manipulated" ? "text-manipulated" : "text-inconclusive")}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Human review {result.verdict === "suspicious" || result.verdict === "inconclusive" ? "recommended" : "not required"}
          </span>
        </motion.div>
      </div>

      <Drawer open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Evidence Breakdown</DrawerTitle>
            <DrawerDescription>
              {result.filename} · {result.signals.length} forensic signals grouped by category
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 sm:px-6">
            <SignalBreakdown signals={result.signals} />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function AnalysisDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
