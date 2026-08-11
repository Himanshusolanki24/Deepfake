import type { Severity, Verdict } from "./analysis";

export type EvidenceKind =
  | "heatmap"
  | "frame"
  | "frequency-plot"
  | "spectrogram"
  | "metadata-finding"
  | "audio-anomaly";

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  title: string;
  description: string;
  analysisId: string;
  filename: string;
  mediaType: "image" | "video" | "audio";
  verdict: Verdict;
  severity: Severity;
  score: number;
  createdAt: string;
  thumbUrl?: string;
}

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  heatmap: "Heatmap",
  frame: "Suspicious frame",
  "frequency-plot": "Frequency plot",
  spectrogram: "Spectrogram",
  "metadata-finding": "Metadata finding",
  "audio-anomaly": "Audio anomaly",
};
