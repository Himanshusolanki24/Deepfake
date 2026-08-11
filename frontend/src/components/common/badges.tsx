import { Badge } from "@/components/ui/badge";
import type { Verdict } from "@/types/analysis";

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const map: Record<Verdict, { label: string; variant: "authentic" | "suspicious" | "manipulated" | "inconclusive" }> = {
    authentic: { label: "Authentic", variant: "authentic" },
    suspicious: { label: "Suspicious", variant: "suspicious" },
    manipulated: { label: "Manipulated", variant: "manipulated" },
    inconclusive: { label: "Inconclusive", variant: "inconclusive" },
  };
  const m = map[verdict];
  return (
    <Badge variant={m.variant}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {m.label}
    </Badge>
  );
}

export function SeverityPill({ severity }: { severity: "low" | "medium" | "high" }) {
  const map = {
    low: { label: "LOW", cls: "text-authentic bg-authentic-soft border-authentic/20" },
    medium: { label: "MEDIUM", cls: "text-suspicious bg-suspicious-soft border-suspicious/25" },
    high: { label: "HIGH", cls: "text-manipulated bg-manipulated-soft border-manipulated/20" },
  } as const;
  const m = map[severity];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const map = {
    low: { label: "Low Risk", cls: "text-authentic" },
    medium: { label: "Medium Risk", cls: "text-suspicious" },
    high: { label: "High Risk", cls: "text-manipulated" },
  } as const;
  const m = map[risk];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${m.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {m.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    complete: { label: "Complete", cls: "text-authentic bg-authentic-soft border-authentic/20" },
    processing: { label: "Processing", cls: "text-info bg-info-soft border-info/20" },
    queued: { label: "Queued", cls: "text-muted-foreground bg-muted border-border" },
    review: { label: "Needs Review", cls: "text-suspicious bg-suspicious-soft border-suspicious/25" },
    failed: { label: "Failed", cls: "text-manipulated bg-manipulated-soft border-manipulated/20" },
  };
  const m = map[status] ?? { label: status, cls: "text-muted-foreground bg-muted border-border" };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

export function ConfidenceBadge({ value }: { value: number }) {
  const tone =
    value >= 75 ? "text-manipulated" : value >= 60 ? "text-suspicious" : "text-authentic";
  return (
    <span className={`hex-mono text-sm font-semibold tabular ${tone}`}>{value}%</span>
  );
}
