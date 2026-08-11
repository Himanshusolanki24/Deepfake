"use client";

import { BadgeCheck, BadgeX, ShieldQuestion, FileText, Camera, MapPin, Cpu, Clock } from "lucide-react";
import type { MediaMetadata } from "@/types/analysis";
import { formatBytes, formatSeconds } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function C2paBadge({ status }: { status: MediaMetadata["c2pa"]["status"] }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-authentic/25 bg-authentic-soft px-2.5 py-1 text-xs font-semibold text-authentic">
        <BadgeCheck className="h-4 w-4" />
        Content Credentials
        <span className="text-[10px] uppercase tracking-wider">· Verified</span>
      </span>
    );
  }
  if (status === "not-present") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-suspicious/25 bg-suspicious-soft px-2.5 py-1 text-xs font-semibold text-suspicious">
        <ShieldQuestion className="h-4 w-4" />
        Content Credentials
        <span className="text-[10px] uppercase tracking-wider">· Not Present</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-manipulated/25 bg-manipulated-soft px-2.5 py-1 text-xs font-semibold text-manipulated">
      <BadgeX className="h-4 w-4" />
      Content Credentials
      <span className="text-[10px] uppercase tracking-wider">· Verification Failed</span>
    </span>
  );
}

function ExifBadge({ status }: { status: MediaMetadata["exifStatus"] }) {
  const map = {
    present: { label: "EXIF Present", cls: "border-authentic/25 bg-authentic-soft text-authentic" },
    absent: { label: "EXIF Absent", cls: "border-inconclusive/25 bg-inconclusive-soft text-inconclusive" },
    stripped: { label: "EXIF Stripped", cls: "border-suspicious/25 bg-suspicious-soft text-suspicious" },
  } as const;
  const m = map[status];
  return <Badge className={`normal-case ${m.cls}`}>{m.label}</Badge>;
}

export function MetadataPanel({ metadata }: { metadata: MediaMetadata }) {
  const rows: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }[] = [
    { label: "Filename", value: metadata.filename, icon: <FileText className="h-3.5 w-3.5" />, mono: true },
    { label: "MIME type", value: metadata.mimeType, mono: true },
    { label: "File size", value: formatBytes(metadata.fileSize), mono: true },
    { label: "Dimensions", value: metadata.dimensions ? `${metadata.dimensions.width} × ${metadata.dimensions.height}` : "—" },
    { label: "Codec", value: metadata.codec ?? "—", mono: true },
    { label: "Duration", value: metadata.duration ? formatSeconds(metadata.duration) : "—", mono: true },
    { label: "Creation timestamp", value: metadata.creationTimestamp ? new Date(metadata.creationTimestamp).toISOString().replace("T", " ").replace("Z", " UTC") : "—", icon: <Clock className="h-3.5 w-3.5" />, mono: true },
    { label: "Modification timestamp", value: metadata.modificationTimestamp ? new Date(metadata.modificationTimestamp).toISOString().replace("T", " ").replace("Z", " UTC") : "—", mono: true },
    { label: "Software", value: metadata.software ?? "—", icon: <Cpu className="h-3.5 w-3.5" /> },
    { label: "Device model", value: metadata.deviceModel ?? "—", icon: <Camera className="h-3.5 w-3.5" /> },
    { label: "Location", value: metadata.location ?? "Not recorded", icon: <MapPin className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <C2paBadge status={metadata.c2pa.status} />
        <ExifBadge status={metadata.exifStatus} />
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0 border-b border-border pb-3">
            <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {row.icon}
              {row.label}
            </dt>
            <dd className={row.mono ? "hex-mono mt-1 truncate text-[13px] text-foreground" : "mt-1 truncate text-[13px] text-foreground"}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="rounded-md border border-border bg-muted/50 px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">
        Metadata forensics inspects the provenance chain, edit history and embedded credentials.
        Missing or stripped credentials are treated as a signal, not proof of manipulation.
      </p>
    </div>
  );
}
