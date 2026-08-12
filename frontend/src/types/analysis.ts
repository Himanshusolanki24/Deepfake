import type { MediaType, AnalysisStatus } from "./media";

export type Verdict = "authentic" | "suspicious" | "manipulated" | "inconclusive";

export type Severity = "low" | "medium" | "high";

export type SignalId =
  | "spatial"
  | "frequency"
  | "temporal"
  | "physiological"
  | "av-sync"
  | "metadata"
  | "voice-spectral"
  | "compression"
  | "ai-generated"
  | "lighting"
  | "face-tracking"
  | "speech-synthetic";

export interface Evidence {
  id: string;
  kind: "heatmap" | "frame" | "frequency-plot" | "spectrogram" | "metadata-finding" | "audio-anomaly";
  label: string;
  timestamp?: string;
  value?: number;
}

export interface SignalResult {
  id: SignalId;
  name: string;
  score: number;
  confidence: number;
  severity: Severity;
  explanation: string;
  technical?: string[];
  evidence?: Evidence[];
  limitations?: string[];
  supportingDetails?: string[];
}

export interface SuspiciousFrame {
  frame: number;
  timestamp: number;
  score: number;
  reason: string;
}

export interface MediaMetadata {
  filename: string;
  mimeType: string;
  fileSize: number;
  dimensions?: { width: number; height: number };
  codec?: string;
  duration?: number;
  creationTimestamp?: string;
  modificationTimestamp?: string;
  software?: string;
  exifStatus: "present" | "absent" | "stripped";
  c2pa: { status: "verified" | "not-present" | "failed" };
  location?: string;
  deviceModel?: string;
  camera?: string;
}

export interface FrequencyPoint {
  frequency: number;
  magnitude: number;
  baseline: number;
  anomalous: boolean;
}

export interface HeatmapRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
  label: string;
}

export interface TimelineEvent {
  time: string;
  title: string;
  severity?: Severity;
  detail?: string;
}

export interface AnalysisResult {
  id: string;
  mediaType: MediaType;
  filename: string;
  previewUrl?: string;
  verdict: Verdict;
  confidence: number;
  confidenceInterval?: { lower: number; upper: number };
  explanation: string;
  signals: SignalResult[];
  suspiciousFrames?: SuspiciousFrame[];
  frequencyData?: FrequencyPoint[];
  heatmapRegions?: HeatmapRegion[];
  timeline?: TimelineEvent[];
  metadata?: MediaMetadata;
  audioAnalysis?: {
    spectralConsistency: number;
    prosody: number;
    pitchNaturalness: number;
    vocoderArtifacts: number;
    breathNoise: number;
    suspiciousSegments: { start: number; end: number; score: number }[];
  };
  processingTime?: number;
  status: AnalysisStatus;
  createdAt: string;
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  authentic: "Authentic",
  suspicious: "Suspicious",
  manipulated: "Manipulated",
  inconclusive: "Inconclusive",
};

export const VERDICT_HEADLINES: Record<Verdict, string> = {
  authentic: "LOW PROBABILITY OF MANIPULATION",
  suspicious: "REQUIRES HUMAN REVIEW",
  manipulated: "HIGH PROBABILITY OF MANIPULATION",
  inconclusive: "INSUFFICIENT EVIDENCE",
};

export const VERDICT_DESCRIPTIONS: Record<Verdict, string> = {
  authentic:
    "Multiple independent forensic signals found no consistent indication of synthetic generation or content manipulation.",
  suspicious:
    "A subset of forensic signals deviate from expected baselines. Human review is recommended before downstream use.",
  manipulated:
    "Multiple independent forensic signals indicate likely synthetic or manipulated content.",
  inconclusive:
    "Available signals were insufficient to reach a confident assessment. Additional source media is recommended.",
};

export const RISK_LABELS: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const VERDICT_TO_RISK: Record<Verdict, Severity> = {
  authentic: "low",
  suspicious: "medium",
  manipulated: "high",
  inconclusive: "medium",
};
