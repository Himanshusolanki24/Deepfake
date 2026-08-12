"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, UploadCloud, FlaskConical, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { AnalysesTable, AnalysesTableSkeleton } from "@/components/analysis/AnalysesTable";
import { MediaDropzone, type UploadedEntry } from "@/components/upload/MediaDropzone";
import { useHistory } from "@/hooks/useAnalysis";
import { useAnalysisStore } from "@/store/analysisStore";
import { toast } from "sonner";
import { DEMO_ANALYSES } from "@/mocks/analyses";

const KPIS = [
  {
    label: "Total Analyses",
    value: "1,284",
    delta: 12.4,
    tone: "info" as const,
    color: "var(--color-info)",
    sparkline: [42, 48, 45, 52, 50, 58, 61, 57, 64, 70, 68, 74],
  },
  {
    label: "Suspicious Media",
    value: "317",
    delta: 8.1,
    tone: "suspicious" as const,
    color: "var(--color-suspicious)",
    sparkline: [20, 18, 24, 22, 26, 25, 28, 27, 30, 29, 33, 32],
  },
  {
    label: "Verified Authentic",
    value: "842",
    delta: 14.2,
    tone: "authentic" as const,
    color: "var(--color-authentic)",
    sparkline: [48, 52, 50, 56, 60, 58, 62, 66, 64, 70, 72, 75],
  },
  {
    label: "Requires Review",
    value: "125",
    delta: -3.4,
    tone: "manipulated" as const,
    color: "var(--color-manipulated)",
    sparkline: [18, 20, 19, 17, 18, 16, 15, 14, 15, 13, 12, 11],
  },
];

function useGreeting() {
  const subscribe = () => () => {};
  return useSyncExternalStore(
    subscribe,
    () => {
      const hour = new Date().getHours();
      return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    },
    () => "Welcome back"
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: recent, isLoading } = useHistory();
  const setPendingEntries = useAnalysisStore((s) => s.setPendingEntries);
  const greeting = useGreeting();

  const goAnalyze = () => router.push("/analyze");

  const onDrop = (entries: UploadedEntry[]) => {
    setPendingEntries(entries);
    router.push("/analyze");
    toast.success("Media staged for analysis");
  };

  const loadDemo = () => {
    const demo = DEMO_ANALYSES[0];
    router.push(`/analysis/${demo.id}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
      >
        <div className="space-y-2">
          <p className="hex-mono flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-info" />
            Forensic Analysis Console
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {greeting ?? "Welcome back"}, Analyst
          </h1>
          <p className="max-w-xl text-[15px] leading-7 text-muted-foreground">
            Review your latest authenticity assessments and investigate suspicious media with
            explainable multi-signal forensics.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button onClick={goAnalyze}>
            <UploadCloud className="h-4 w-4" />
            Analyze Media
          </Button>
          <Button variant="outline" onClick={loadDemo}>
            <FlaskConical className="h-4 w-4" />
            Load Demo Analysis
          </Button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {KPIS.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-5"
      >
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick analysis</CardTitle>
            <CardDescription className="text-xs">
              Drop a file to stage it for a full multi-signal assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MediaDropzone onFilesAccepted={onDrop} compact />
          </CardContent>
        </Card>
        <div className="lg:col-span-3">
          <ActivityChart />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent Analyses</h2>
            <p className="text-xs text-muted-foreground">
              Latest forensic assessments across your workspace
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-info"
            onClick={() => router.push("/history")}
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        {isLoading ? (
          <AnalysesTableSkeleton rows={5} />
        ) : (
          <AnalysesTable
            analyses={(recent ?? []).slice(0, 6)}
            onRowClick={(a) => router.push(`/analysis/${a.id}`)}
          />
        )}
      </motion.section>
    </div>
  );
}
