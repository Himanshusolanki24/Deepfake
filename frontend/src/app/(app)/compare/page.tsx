"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { GitCompare, ArrowRight } from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/common/badges";
import { VerdictCard } from "@/components/analysis/VerdictCard";
import { VERDICT_LABELS } from "@/types/analysis";
import { cn } from "@/lib/utils";

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={<CompareSkeleton />}>
      <ComparePage />
    </Suspense>
  );
}

function ComparePage() {
  const params = useSearchParams();
  const router = useRouter();
  const aId = params.get("a") ?? "";
  const bId = params.get("b") ?? "";

  const { data: a, isLoading: aLoading, isError: aError } = useAnalysis(aId);
  const { data: b, isLoading: bLoading, isError: bError } = useAnalysis(bId);

  const chartData = useMemo<{ name: string; [key: string]: string | number }[]>(() => {
    if (!a || !b) return [];
    const ids = new Set([...a.signals.map((s) => s.id), ...b.signals.map((s) => s.id)]);
    return [...ids].map((id) => ({
      name: a.signals.find((s) => s.id === id)?.name ?? b.signals.find((s) => s.id === id)?.name ?? id,
      [aId]: a.signals.find((s) => s.id === id)?.score ?? 0,
      [bId]: b.signals.find((s) => s.id === id)?.score ?? 0,
    }));
  }, [a, b, aId, bId]);

  const topDifference = useMemo(() => {
    if (!a || !b || chartData.length === 0) return null;
    let best: { name: string; delta: number; higher: "A" | "B" } | null = null;
    for (const row of chartData) {
      const av = Number(row[aId]);
      const bv = Number(row[bId]);
      const delta = Math.abs(av - bv);
      if (!best || delta > best.delta) {
        best = { name: String(row.name), delta, higher: av >= bv ? "A" : "B" };
      }
    }
    return best;
  }, [a, b, chartData, aId, bId]);

  if (aLoading || bLoading) return <CompareSkeleton />;
  if (aError || bError || !a || !b) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          title="Unable to compare analyses"
          description="One of the selected analyses could not be loaded."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const riskTone = (id: string) => (id === aId ? "text-info" : "text-suspicious");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Comparative Forensics"
        title="Compare Analyses"
        description="Side-by-side forensic signal comparison of two cases."
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/history")}>
            Select cases
          </Button>
        }
      />

      {topDifference && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Key Difference
          </span>
          <span className="font-medium text-foreground">{topDifference.name}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className={riskTone(aId)}>A</span>
            <ArrowRight className="h-3 w-3" />
            <span className={riskTone(bId)}>B</span>
            <span className="hex-mono font-semibold text-foreground tabular">
              Δ {topDifference.delta.toFixed(2)}
            </span>
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {topDifference.higher} shows the stronger signal discrepancy
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <CompareHeading id={aId} label="Analysis A" className="text-info" result={a} />
          <VerdictCard result={a} />
        </div>
        <div className="space-y-4">
          <CompareHeading id={bId} label="Analysis B" className="text-suspicious" result={b} />
          <VerdictCard result={b} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <GitCompare className="h-4 w-4 text-info" />
              Signal Comparison
            </CardTitle>
            <CardDescription className="text-xs">Suspicion scores per forensic signal (0–1)</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={{ stroke: "var(--color-border)" }}
                  tickLine={false}
                  interval={0}
                  angle={-24}
                  textAnchor="end"
                  height={56}
                />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
                  formatter={(value) => [Number(value).toFixed(2), "score"]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={aId} name={`A · ${VERDICT_LABELS[a.verdict]}`} radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill="#2563eb" opacity={Number(entry[aId]) >= 0.6 ? 1 : 0.5} />
                  ))}
                </Bar>
                <Bar dataKey={bId} name={`B · ${VERDICT_LABELS[b.verdict]}`} radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill="#d97706" opacity={Number(entry[bId]) >= 0.6 ? 1 : 0.5} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Signal-by-signal breakdown</CardTitle>
            <CardDescription className="text-xs">Side-by-side scores and severity</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2.5">
              {chartData.map((row) => (
                <div key={row.name} className="rounded-md border border-border px-3 py-2.5">
                  <p className="mb-1.5 text-[12px] font-medium text-foreground">{row.name}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={riskTone(aId)}>A</span>
                        <span className="hex-mono tabular text-muted-foreground">{Number(row[aId]).toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full" style={{ width: `${Number(row[aId]) * 100}%`, backgroundColor: "#2563eb" }} />
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={riskTone(bId)}>B</span>
                        <span className="hex-mono tabular text-muted-foreground">{Number(row[bId]).toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full" style={{ width: `${Number(row[bId]) * 100}%`, backgroundColor: "#d97706" }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompareHeading({
  id,
  label,
  className,
  result,
}: {
  id: string;
  label: string;
  className: string;
  result: { verdict: "authentic" | "suspicious" | "manipulated" | "inconclusive"; confidence: number };
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={cn("hex-mono text-xs font-bold uppercase tracking-wider", className)}>{label}</span>
        <span className="hex-mono text-[13px] font-semibold text-foreground">{id}</span>
      </div>
      <div className="flex items-center gap-2">
        <VerdictBadge verdict={result.verdict} />
        <span className="hex-mono text-sm font-semibold tabular text-foreground">{result.confidence}%</span>
      </div>
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
