"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  Trash2,
  GitCompare,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import { useHistory } from "@/hooks/useAnalysis";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/empty-state";
import { AnalysesTableSkeleton } from "@/components/analysis/AnalysesTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VERDICT_LABELS, type Verdict } from "@/types/analysis";
import { MEDIA_TYPE_LABELS, type MediaType } from "@/types/media";

type ResultFilter = "all" | Verdict;
type DateFilter = "all" | "today" | "7d" | "30d";

const PAGE_SIZE = 8;

function isWithinDays(dateIso: string, days: number) {
  return Date.now() - new Date(dateIso).getTime() <= days * 24 * 60 * 60 * 1000;
}

export default function HistoryPageWrapper() {
  return (
    <Suspense fallback={<AnalysesTableSkeleton rows={PAGE_SIZE} />}>
      <HistoryPage />
    </Suspense>
  );
}

function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: analyses, isLoading, isError, refetch } = useHistory();

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [mediaType, setMediaType] = useState<"all" | MediaType>("all");
  const [result, setResult] = useState<ResultFilter>("all");
  const [date, setDate] = useState<DateFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    const list = analyses ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((a) => {
      if (q && !a.id.toLowerCase().includes(q) && !a.filename.toLowerCase().includes(q)) return false;
      if (mediaType !== "all" && a.mediaType !== mediaType) return false;
      if (result !== "all" && a.verdict !== result) return false;
      if (date === "today") return isWithinDays(a.createdAt, 1);
      if (date === "7d") return isWithinDays(a.createdAt, 7);
      if (date === "30d") return isWithinDays(a.createdAt, 30);
      return true;
    });
  }, [analyses, query, mediaType, result, date]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const selectedCount = selected.length;

  const handleExport = () => {
    toast.success(`Exported ${selectedCount || filtered.length} case records as CSV`);
  };

  const handleDelete = () => {
    setConfirmOpen(false);
    setSelected([]);
    toast.success("Selected analyses removed");
  };

  const handleCompare = () => {
    const ids = selected.slice(0, 2);
    if (ids.length < 2) {
      toast.info("Select exactly two analyses to compare");
      return;
    }
    router.push(`/compare?a=${ids[0]}&b=${ids[1]}`);
  };

  const handleReport = () => {
    const id = selected[0];
    if (!id) {
      toast.info("Select an analysis to generate a report");
      return;
    }
    router.push(`/analysis/${id}/report`);
  };

  const hasActiveFilters = query || mediaType !== "all" || result !== "all" || date !== "all";

  const resetFilters = () => {
    setQuery("");
    setMediaType("all");
    setResult("all");
    setDate("all");
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Case Archive"
        title="Analysis History"
        description="Search, filter and compare all forensic assessments."
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by case ID or filename…"
              className="pl-9"
              aria-label="Search analyses"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
            <Select value={mediaType} onValueChange={(v) => { setMediaType(v as "all" | MediaType); setPage(1); }}>
              <SelectTrigger className="h-9" aria-label="Filter by media type">
                <SelectValue placeholder="Media type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="image">{MEDIA_TYPE_LABELS.image}</SelectItem>
                <SelectItem value="video">{MEDIA_TYPE_LABELS.video}</SelectItem>
                <SelectItem value="audio">{MEDIA_TYPE_LABELS.audio}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={result} onValueChange={(v) => { setResult(v as ResultFilter); setPage(1); }}>
              <SelectTrigger className="h-9" aria-label="Filter by result">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                {Object.entries(VERDICT_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={date} onValueChange={(v) => { setDate(v as DateFilter); setPage(1); }}>
              <SelectTrigger className="h-9" aria-label="Filter by date">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any date</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9" onClick={resetFilters}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-info/20 bg-info-soft px-3 py-2">
            <span className="text-xs font-medium text-info tabular">{selectedCount} selected</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleCompare}>
                <GitCompare className="h-3.5 w-3.5" /> Compare
              </Button>
              <Button variant="outline" size="sm" onClick={handleReport}>
                <FileText className="h-3.5 w-3.5" /> Report
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <div>
        {isLoading ? (
          <AnalysesTableSkeleton rows={PAGE_SIZE} />
        ) : isError ? (
          <ErrorState
            title="Unable to load history"
            description="Analysis service is temporarily unavailable."
            onRetry={() => void refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No forensic analyses yet"
            description="Upload your first piece of media to begin an authenticity assessment."
            action={
              <Button onClick={() => router.push("/analyze")}>Analyze Media</Button>
            }
          />
        ) : (
          <HistoryTable
            analyses={paged}
            selected={selected}
            onToggle={toggleSelect}
            onOpen={(id) => router.push(`/analysis/${id}`)}
          />
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground tabular">
            {filtered.length} total · page {safePage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedCount} analysis{selectedCount === 1 ? "" : "es"}?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected case records and their associated evidence. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryTable({
  analyses,
  selected,
  onToggle,
  onOpen,
}: {
  analyses: AnalysisResult[];
  selected: string[];
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border text-left">
              <th className="w-10 px-4 py-2.5">
                <Checkbox
                  checked={selected.length === analyses.length && analyses.length > 0}
                  onCheckedChange={() =>
                    analyses.forEach((a) => {
                      if (!selected.includes(a.id)) onToggle(a.id);
                    })
                  }
                  aria-label="Select all rows on this page"
                />
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Case ID</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Media</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Result</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confidence</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Analyzed</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((a) => (
              <tr
                key={a.id}
                className={cn(
                  "cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-accent/60",
                  selected.includes(a.id) && "bg-accent"
                )}
                onClick={() => onToggle(a.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onToggle(a.id);
                }}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.includes(a.id)} onCheckedChange={() => onToggle(a.id)} aria-label={`Select ${a.id}`} />
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(a.id);
                    }}
                    className="hex-mono text-[13px] font-semibold text-info hover:underline"
                  >
                    {a.id}
                  </button>
                </td>
                <td className="max-w-[220px] truncate px-3 py-3 text-[13px] font-medium text-foreground">{a.filename}</td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{MEDIA_TYPE_LABELS[a.mediaType]}</td>
                <td className="px-3 py-3">
                  <Badge
                    variant={
                      a.verdict === "authentic"
                        ? "authentic"
                        : a.verdict === "suspicious"
                          ? "suspicious"
                          : a.verdict === "manipulated"
                            ? "manipulated"
                            : "inconclusive"
                    }
                  >
                    {VERDICT_LABELS[a.verdict]}
                  </Badge>
                </td>
                <td className="hex-mono px-3 py-3 text-right text-[13px] font-semibold tabular text-foreground">{a.confidence}%</td>
                <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground tabular">
                  {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
