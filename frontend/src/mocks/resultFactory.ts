import type { AnalysisResult, FrequencyPoint, SignalResult, Verdict } from "@/types/analysis";
import type { MediaFile } from "@/types/media";
import { generateFrequencyData, DEMO_ANALYSES } from "./analyses";
import { registerAnalysis } from "./registry";

export type UploadedResult = AnalysisResult & {
  processingTime: number;
};

function makeSignal(
  id: SignalResult["id"],
  name: string,
  score: number,
  confidence: number,
  severity: SignalResult["severity"],
  explanation: string,
  technical?: string[]
): SignalResult {
  return { id, name, score, confidence, severity, explanation, technical };
}

function seededScore(filename: string, salt: number): number {
  let h = 0;
  for (let i = 0; i < filename.length; i++) h = (h * 31 + filename.charCodeAt(i)) >>> 0;
  return ((h + salt * 7919) % 1000) / 1000;
}

export function buildUploadedResult(file: MediaFile, id: string, signalsEnabled: string[]): UploadedResult {
  const rand = seededScore(file.filename, 17);
  const verdict: Verdict =
    rand < 0.4 ? "authentic" : rand < 0.7 ? "suspicious" : rand < 0.9 ? "manipulated" : "inconclusive";

  const enabled = (id: string) => signalsEnabled.includes(id) || signalsEnabled.length === 0;

  const signals: SignalResult[] = [];

  const severityFor = (score: number): SignalResult["severity"] =>
    score >= 0.7 ? "high" : score >= 0.45 ? "medium" : "low";

  if (enabled("spatial")) {
    const s = rand * 0.92;
    signals.push(
      makeSignal(
        "spatial",
        "Spatial Artifacts",
        +s.toFixed(2),
        0.92,
        severityFor(s),
        s >= 0.6
          ? "Detected inconsistent facial texture and blending artifacts."
          : "Texture statistics consistent with a single capture chain.",
        s >= 0.6
          ? ["Blending seam localized at feature boundaries", "Upsampling checkerboard at 4x zoom"]
          : ["No blending seams detected", "Sensor noise pattern intact"]
      )
    );
  }
  if (enabled("frequency")) {
    const s = rand * 0.8 + 0.08;
    signals.push(
      makeSignal(
        "frequency",
        "Frequency Domain",
        +s.toFixed(2),
        0.88,
        severityFor(s),
        s >= 0.6
          ? "Frequency spectrum contains anomalous high-frequency patterns."
          : "Spectrum matches expected sensor noise profile.",
        s >= 0.6 ? ["Anomalous energy in mid-band", "Deviation from natural baseline"] : []
      )
    );
  }
  if (enabled("temporal")) {
    const s = file.type === "video" ? rand * 0.86 + 0.04 : 0.03;
    signals.push(
      makeSignal(
        "temporal",
        "Temporal Consistency",
        +s.toFixed(2),
        0.85,
        severityFor(s),
        s >= 0.6 ? "Motion dynamics deviate from natural human behavior." : "Motion dynamics within expected range."
      )
    );
  }
  if (enabled("physiological") && file.type !== "audio") {
    const s = rand * 0.6 + 0.05;
    signals.push(
      makeSignal(
        "physiological",
        "Physiological Signals",
        +s.toFixed(2),
        0.81,
        severityFor(s),
        s >= 0.5 ? "rPPG proxy shows minor inconsistencies." : "Physiological proxy signal within expected range."
      )
    );
  }
  if (enabled("av-sync") && file.type === "video") {
    const s = rand * 0.9;
    signals.push(
      makeSignal(
        "av-sync",
        "Audio / Visual Sync",
        +s.toFixed(2),
        0.95,
        severityFor(s),
        s >= 0.7
          ? "Lip-sync offset exceeds natural tolerance across multiple windows."
          : "A/V synchronization within natural tolerance."
      )
    );
  }
  if (enabled("voice-spectral") && file.type === "audio") {
    const s = rand * 0.92;
    signals.push(
      makeSignal(
        "voice-spectral",
        "Voice Spectral Analysis",
        +s.toFixed(2),
        0.94,
        severityFor(s),
        s >= 0.7
          ? "Spectral envelope characteristic of neural vocoder output."
          : "Spectral envelope consistent with natural articulation."
      )
    );
  }
  if (enabled("metadata")) {
    const s = 0.18 + rand * 0.3;
    signals.push(
      makeSignal(
        "metadata",
        "Metadata / Provenance",
        +s.toFixed(2),
        0.9,
        severityFor(s),
        s >= 0.4 ? "Provenance chain incomplete." : "Provenance chain consistent."
      )
    );
  }

  const anomalyBands: [number, number][] =
    verdict === "manipulated"
      ? [[28, 44]]
      : verdict === "suspicious"
        ? [[34, 40]]
        : [];
  const frequencyData: FrequencyPoint[] = generateFrequencyData(
    Math.floor(rand * 100),
    anomalyBands
  );

  const baseConfidence =
    verdict === "authentic" ? 88 + rand * 9 : verdict === "manipulated" ? 84 + rand * 10 : verdict === "suspicious" ? 70 + rand * 16 : 38 + rand * 12;
  const confidence = Math.round(baseConfidence);

  const base = DEMO_ANALYSES[verdict === "authentic" ? 1 : verdict === "manipulated" ? 2 : verdict === "suspicious" ? 0 : 3];

  const result: UploadedResult = {
    id,
    mediaType: file.type,
    filename: file.filename,
    previewUrl: file.previewUrl,
    verdict,
    confidence,
    confidenceInterval: {
      lower: Math.max(0, confidence - 5),
      upper: Math.min(99, confidence + 4),
    },
    explanation: base.explanation,
    signals,
    suspiciousFrames: file.type === "video" ? base.suspiciousFrames : undefined,
    frequencyData,
    heatmapRegions: file.type === "image" ? base.heatmapRegions : undefined,
    timeline: base.timeline,
    metadata: {
      filename: file.filename,
      mimeType: file.mimeType,
      fileSize: file.size,
      dimensions: file.dimensions,
      codec: file.type === "video" ? "H.264 / AAC" : file.type === "audio" ? "PCM 16-bit" : "JPEG",
      duration: file.duration,
      creationTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      modificationTimestamp: new Date().toISOString(),
      software: "Uploaded via AUTHENTIQ web client",
      exifStatus: "stripped",
      c2pa: { status: "not-present" },
    },
    audioAnalysis: file.type === "audio" ? base.audioAnalysis : undefined,
    status: "complete",
    createdAt: new Date().toISOString(),
    processingTime: 4 + Math.floor(rand * 20),
  };

  registerAnalysis(result);
  return result;
}
