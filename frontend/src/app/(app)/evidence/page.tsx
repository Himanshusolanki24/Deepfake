"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  Flame,
  Video,
  AudioLines,
  ChartNoAxesCombined,
  FileSearch,
  CircleAlert,
  Layers,
  ExternalLink,
} from "lucide-react";
import { EVIDENCE_ITEMS } from "@/mocks/evidence";
import { EVIDENCE_KIND_LABELS, type EvidenceKind } from "@/types/evidence";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SeverityPill } from "@/components/common/badges";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const KIND_ICONS: Record<EvidenceKind, React.ReactNode> = {
  heatmap: <Flame className="h-4 w-4" />,
  frame: <Video className="h-4 w-4" />,
  "frequency-plot": <ChartNoAxesCombined className="h-4 w-4" />,
  spectrogram: <AudioLines className="h-4 w-4" />,
  "metadata-finding": <FileSearch className="h-4 w-4" />,
  "audio-anomaly": <CircleAlert className="h-4 w-4" />,
};

export default function EvidenceLibraryPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | EvidenceKind>("all");
  const [verdict, setVerdict] = useState<"all" | string>("all");
  const [viewer, setViewer] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EVIDENCE_ITEMS.filter((e) => {
      if (q && !e.title.toLowerCase().includes(q) && !e.filename.toLowerCase().includes(q)) return false;
      if (kind !== "all" && e.kind !== kind) return false;
      if (verdict !== "all" && e.verdict !== verdict) return false;
      return true;
    });
  }, [query, kind, verdict]);

  const viewerItem = viewer !== null ? EVIDENCE_ITEMS[viewer] : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Forensic Repository"
        title="Evidence Library"
        description="Searchable repository of forensic artifacts: heatmaps, suspicious frames, frequency plots and audio anomalies."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search evidence…"
            className="pl-9"
            aria-label="Search evidence"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:w-[420px]">
          <Select value={kind} onValueChange={(v) => setKind(v as "all" | EvidenceKind)}>
            <SelectTrigger aria-label="Filter by evidence kind">
              <SelectValue placeholder="Evidence kind" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {Object.entries(EVIDENCE_KIND_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={verdict} onValueChange={setVerdict}>
            <SelectTrigger aria-label="Filter by verdict">
              <SelectValue placeholder="Verdict" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All verdicts</SelectItem>
              <SelectItem value="authentic">Authentic</SelectItem>
              <SelectItem value="suspicious">Suspicious</SelectItem>
              <SelectItem value="manipulated">Manipulated</SelectItem>
              <SelectItem value="inconclusive">Inconclusive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="No evidence found"
          description="No forensic artifacts match the current filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
            >
              <Card className="group overflow-hidden">
                <div className={cn("grid-paper relative flex h-32 items-center justify-center bg-[#0c1424]")}>
                  <div className="flex items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent p-3 text-[#7fb4ff]">
                    {KIND_ICONS[item.kind]}
                  </div>
                  <Badge variant="muted" className="absolute left-2 top-2 bg-black/50 text-white normal-case backdrop-blur">
                    {EVIDENCE_KIND_LABELS[item.kind]}
                  </Badge>
                  <span className="hex-mono absolute bottom-2 left-2 text-[10px] text-white/50">
                    {item.analysisId}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold leading-5 text-foreground">{item.title}</p>
                    <SeverityPill severity={item.severity} />
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge
                        variant={
                          item.verdict === "authentic" ? "authentic" : item.verdict === "suspicious" ? "suspicious" : item.verdict === "manipulated" ? "manipulated" : "inconclusive"
                        }
                        className="normal-case"
                      >
                        {item.verdict}
                      </Badge>
                      <span className="hex-mono tabular">{item.score.toFixed(2)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => {
                        setViewer(EVIDENCE_ITEMS.findIndex((e) => e.id === item.id));
                      }}
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={viewer !== null} onOpenChange={() => setViewer(null)}>
        <DialogContent className="max-w-2xl">
          {viewerItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {KIND_ICONS[viewerItem.kind]}
                  {viewerItem.title}
                </DialogTitle>
                <DialogDescription>{EVIDENCE_KIND_LABELS[viewerItem.kind]}</DialogDescription>
              </DialogHeader>
              <div className="grid-paper flex h-64 items-center justify-center rounded-lg bg-[#0c1424]">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-[#7fb4ff]">
                    {KIND_ICONS[viewerItem.kind]}
                  </div>
                  <p className="hex-mono text-[11px] text-white/60">
                    {viewerItem.filename} · {viewerItem.analysisId}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</p>
                  <p className="hex-mono font-semibold text-foreground">{viewerItem.score.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Severity</p>
                  <p className="font-medium capitalize text-foreground">{viewerItem.severity}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Case</p>
                  <p className="hex-mono text-foreground">{viewerItem.analysisId}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { toast.success("Evidence linked to report"); }}>
                  Add to report
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setViewer(null); toast.success("Opened in full evidence viewer"); }}
                >
                  Open full viewer
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
