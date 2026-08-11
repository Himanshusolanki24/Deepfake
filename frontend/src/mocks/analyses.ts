import type {
  AnalysisResult,
  Evidence,
  FrequencyPoint,
  HeatmapRegion,
  SignalResult,
  SuspiciousFrame,
  TimelineEvent,
  Verdict,
} from "@/types/analysis";

function isoAgo(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function makeSignal(
  id: SignalResult["id"],
  name: string,
  score: number,
  confidence: number,
  severity: SignalResult["severity"],
  explanation: string,
  technical?: string[],
  evidence?: Evidence[]
): SignalResult {
  return { id, name, score, confidence, severity, explanation, technical, evidence };
}

export function generateFrequencyData(seed = 1, anomalyBands: [number, number][] = []): FrequencyPoint[] {
  const points: FrequencyPoint[] = [];
  const rng = mulberry32(seed);
  for (let f = 1; f <= 120; f += 1) {
    const magnitude = 18 * Math.exp(-((f - 8) ** 2) / 200) + 4 * Math.exp(-((f - 34) ** 2) / 12) + 2 + rng() * 1.5;
    const anomalous = anomalyBands.some(([lo, hi]) => f >= lo && f <= hi);
    points.push({
      frequency: f,
      magnitude: parseFloat(magnitude.toFixed(3)),
      baseline: parseFloat((16 * Math.exp(-((f - 8) ** 2) / 220) + 2.2).toFixed(3)),
      anomalous,
    });
  }
  return points;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeHeatmapRegions(verdict: Verdict): HeatmapRegion[] {
  const base = [
    { x: 38, y: 18, width: 9, height: 6, intensity: 0.82, label: "Left eye region" },
    { x: 54, y: 18, width: 9, height: 6, intensity: 0.88, label: "Right eye region" },
    { x: 44, y: 52, width: 12, height: 7, intensity: 0.71, label: "Mouth blending" },
    { x: 30, y: 40, width: 40, height: 4, intensity: 0.46, label: "Skin boundary" },
    { x: 10, y: 8, width: 80, height: 5, intensity: 0.58, label: "Hair / face edge" },
  ];
  if (verdict === "authentic") {
    return base.map((r) => ({ ...r, intensity: parseFloat((r.intensity * 0.18).toFixed(2)) }));
  }
  if (verdict === "manipulated") {
    return base.map((r) => ({ ...r, intensity: parseFloat(Math.min(0.97, r.intensity * 1.08).toFixed(2)) }));
  }
  return base;
}

function makeSuspiciousFrames(): SuspiciousFrame[] {
  return [
    { frame: 12, timestamp: 12.4, score: 0.12, reason: "Baseline frame" },
    { frame: 13, timestamp: 13.5, score: 0.15, reason: "Baseline frame" },
    { frame: 14, timestamp: 14.6, score: 0.76, reason: "Lip-sync discontinuity" },
    { frame: 15, timestamp: 15.7, score: 0.82, reason: "Facial texture artifact" },
    { frame: 16, timestamp: 16.8, score: 0.22, reason: "Baseline frame" },
    { frame: 27, timestamp: 27.9, score: 0.71, reason: "Blending seam at jawline" },
    { frame: 28, timestamp: 29.0, score: 0.79, reason: "Inconsistent blink rate" },
  ];
}

function makeTimeline(verdict: Verdict): TimelineEvent[] {
  const t = [
    { time: "12:42:01", title: "Media uploaded", detail: "Hash: sha256:4f3c…9a2d" },
    { time: "12:42:02", title: "File integrity verified", detail: "Checksum matched, no container anomalies" },
    { time: "12:42:04", title: "Frame extraction", detail: "32 frames sampled across 4.2s window" },
    { time: "12:42:05", title: "Face detected", detail: "Single face, frontal alignment" },
  ];
  const signals: TimelineEvent[] = [
    { time: "12:42:06", title: "Spatial anomaly detected", severity: "high", detail: "Blending artifacts at facial boundaries" },
    { time: "12:42:08", title: "Frequency anomaly detected", severity: "high", detail: "Anomalous energy in 28–44 Hz band" },
    { time: "12:42:10", title: "Temporal inconsistency detected", severity: "medium", detail: "Micro-expression phase drift" },
    { time: "12:42:11", title: "Metadata inspection complete", severity: "low", detail: "EXIF stripped, no C2PA credentials" },
  ];
  const end = [
    { time: "12:42:12", title: "Evidence fusion completed", detail: "6 signals weighted and fused" },
    { time: "12:42:13", title: "Final confidence calculated", detail: `Verdict: ${verdict}` },
  ];
  return [...t, ...signals, ...end];
}

export const DEMO_ANALYSES: AnalysisResult[] = [
  {
    id: "VID-2026-00182",
    mediaType: "video",
    filename: "politician_interview.mp4",
    previewUrl: "",
    verdict: "suspicious",
    confidence: 87,
    confidenceInterval: { lower: 82, upper: 91 },
    explanation:
      "Multiple independent forensic signals indicate likely synthetic or manipulated content.",
    status: "complete",
    createdAt: isoAgo(0.2),
    processingTime: 24,
    signals: [
      makeSignal(
        "spatial",
        "Spatial Artifacts",
        0.81,
        0.93,
        "high",
        "Detected inconsistent facial texture and blending artifacts.",
        ["Blending seam localized at jawline and hair boundary", "Frequency leakage around face contour", "GAN-style upsampling checkerboard at 4x zoom"]
      ),
      makeSignal(
        "frequency",
        "Frequency Domain",
        0.65,
        0.88,
        "medium",
        "Frequency spectrum contains anomalous high-frequency patterns.",
        ["Energy spike in 28–44 Hz band", "Deviation from natural skin-texture baseline"]
      ),
      makeSignal(
        "physiological",
        "Physiological Signals",
        0.4,
        0.81,
        "low",
        "Blood-flow proxy signal within expected range.",
        ["Pulse estimate: 71 ± 6 bpm", "No rPPG phase anomaly"]
      ),
      makeSignal(
        "temporal",
        "Temporal Consistency",
        0.76,
        0.9,
        "high",
        "Micro-expressions exhibit phase drift inconsistent with natural motion.",
        ["Blink dynamics abnormally regular", "15% phase drift in mouth region"]
      ),
      makeSignal(
        "av-sync",
        "Audio / Visual Sync",
        0.88,
        0.95,
        "high",
        "Lip-sync offset exceeds natural tolerance across multiple windows.",
        ["Mean A/V offset 184 ms", "Offset variance spikes at 14.6s and 27.9s"]
      ),
      makeSignal(
        "metadata",
        "Metadata / Provenance",
        0.22,
        0.97,
        "low",
        "No content credentials found; EXIF stripped from source.",
        ["C2PA manifest absent", "EXIF stripped", "Software tag: unknown"]
      ),
    ],
    suspiciousFrames: makeSuspiciousFrames(),
    frequencyData: generateFrequencyData(42, [[28, 44]]),
    heatmapRegions: makeHeatmapRegions("suspicious"),
    timeline: makeTimeline("suspicious"),
    metadata: {
      filename: "politician_interview.mp4",
      mimeType: "video/mp4",
      fileSize: 48_234_918,
      dimensions: { width: 1920, height: 1080 },
      codec: "H.264 / AAC",
      duration: 31.4,
      creationTimestamp: "2026-02-14T09:12:00Z",
      modificationTimestamp: "2026-02-14T09:41:22Z",
      software: "Unknown (editor metadata stripped)",
      exifStatus: "stripped",
      c2pa: { status: "not-present" },
      deviceModel: "Unknown",
    },
  },
  {
    id: "IMG-2026-00014",
    mediaType: "image",
    filename: "family_photo.jpg",
    previewUrl: "",
    verdict: "authentic",
    confidence: 94,
    confidenceInterval: { lower: 91, upper: 96 },
    explanation:
      "Multiple independent forensic signals found no consistent indication of synthetic generation or content manipulation.",
    status: "complete",
    createdAt: isoAgo(3.5),
    processingTime: 6,
    signals: [
      makeSignal("spatial", "Spatial Artifacts", 0.09, 0.96, "low", "No blending or texture anomalies detected.", ["Textures consistent with single-capture optics", "No upsampling artifacts at 4x zoom"]),
      makeSignal("frequency", "Frequency Domain", 0.11, 0.94, "low", "Spectrum matches natural sensor noise profile.", ["No high-frequency anomalies", "Camera-specific PRNU consistent"]),
      makeSignal("physiological", "Physiological Signals", 0.14, 0.9, "low", "No physiological inconsistencies.", []),
      makeSignal("temporal", "Temporal Consistency", 0.06, 0.88, "low", "N/A for still image; sampled EXIF chain intact.", []),
      makeSignal("av-sync", "Audio / Visual Sync", 0.02, 0.97, "low", "No audio track present.", []),
      makeSignal("metadata", "Metadata / Provenance", 0.22, 0.93, "low", "EXIF present and internally consistent.", ["Camera: Canon EOS R6", "Timestamp chain plausible", "GPS coordinates match stated location"]),
    ],
    frequencyData: generateFrequencyData(7),
    heatmapRegions: makeHeatmapRegions("authentic"),
    timeline: makeTimeline("authentic"),
    metadata: {
      filename: "family_photo.jpg",
      mimeType: "image/jpeg",
      fileSize: 3_412_206,
      dimensions: { width: 6000, height: 4000 },
      codec: "JPEG",
      creationTimestamp: "2026-01-03T17:28:00Z",
      modificationTimestamp: "2026-01-03T17:28:12Z",
      software: "Canon EOS R6",
      exifStatus: "present",
      c2pa: { status: "not-present" },
      deviceModel: "Canon EOS R6",
      camera: "RF 24-105mm F4 L IS USM",
      location: "Portland, Oregon",
    },
  },
  {
    id: "AUD-2026-00071",
    mediaType: "audio",
    filename: "synthetic_voice.wav",
    previewUrl: "",
    verdict: "manipulated",
    confidence: 91,
    confidenceInterval: { lower: 87, upper: 94 },
    explanation:
      "Multiple independent forensic signals indicate likely synthetic or manipulated content.",
    status: "complete",
    createdAt: isoAgo(5.0),
    processingTime: 11,
    signals: [
      makeSignal("voice-spectral", "Voice Spectral Analysis", 0.9, 0.96, "high", "Spectral envelope characteristic of neural vocoder.", ["Vocoder phase discontinuities at 0.3 Hz rate", "Formant trajectories unnaturally smooth"]),
      makeSignal("frequency", "Frequency Domain", 0.78, 0.92, "high", "Anomalous energy distribution above 4 kHz.", []),
      makeSignal("av-sync", "Audio / Visual Sync", 0.12, 0.89, "low", "No visual track.", []),
      makeSignal("metadata", "Metadata / Provenance", 0.34, 0.9, "low", "WAV header partially modified.", ["Encoder tag inconsistent with sample rate"]),
      makeSignal("spatial", "Spatial Artifacts", 0.05, 0.91, "low", "No visual artifacts (audio source).", []),
      makeSignal("temporal", "Temporal Consistency", 0.82, 0.9, "high", "Breath noise absent between phrases.", []),
    ],
    frequencyData: generateFrequencyData(99, [[40, 60]]),
    audioAnalysis: {
      spectralConsistency: 0.12,
      prosody: 0.21,
      pitchNaturalness: 0.19,
      vocoderArtifacts: 0.9,
      breathNoise: 0.08,
      suspiciousSegments: [
        { start: 6.0, end: 9.5, score: 0.86 },
        { start: 18.0, end: 22.0, score: 0.93 },
      ],
    },
    timeline: makeTimeline("manipulated"),
    metadata: {
      filename: "synthetic_voice.wav",
      mimeType: "audio/wav",
      fileSize: 5_890_112,
      codec: "PCM 16-bit 44.1kHz",
      duration: 31.0,
      creationTimestamp: "2026-02-20T14:02:00Z",
      modificationTimestamp: "2026-02-20T14:02:09Z",
      software: "Unknown",
      exifStatus: "absent",
      c2pa: { status: "not-present" },
    },
  },
  {
    id: "VID-2026-00161",
    mediaType: "video",
    filename: "lowlight_cctv_12.mov",
    previewUrl: "",
    verdict: "inconclusive",
    confidence: 42,
    confidenceInterval: { lower: 35, upper: 49 },
    explanation:
      "Available signals were insufficient to reach a confident assessment. Additional source media is recommended.",
    status: "complete",
    createdAt: isoAgo(26),
    processingTime: 18,
    signals: [
      makeSignal("spatial", "Spatial Artifacts", 0.52, 0.72, "medium", "Compression noise complicates texture analysis.", []),
      makeSignal("frequency", "Frequency Domain", 0.48, 0.68, "medium", "Heavy recompression masks spectral signatures.", []),
      makeSignal("temporal", "Temporal Consistency", 0.31, 0.66, "low", "Low frame rate limits temporal sampling.", []),
      makeSignal("physiological", "Physiological Signals", 0.5, 0.61, "medium", "Signal too weak to measure reliably.", []),
      makeSignal("av-sync", "Audio / Visual Sync", 0.08, 0.9, "low", "No audio track present.", []),
      makeSignal("metadata", "Metadata / Provenance", 0.61, 0.74, "medium", "Container rewritten multiple times.", []),
    ],
    frequencyData: generateFrequencyData(55, [[60, 75]]),
    heatmapRegions: makeHeatmapRegions("inconclusive"),
    timeline: makeTimeline("inconclusive"),
    metadata: {
      filename: "lowlight_cctv_12.mov",
      mimeType: "video/quicktime",
      fileSize: 92_118_003,
      dimensions: { width: 1280, height: 720 },
      codec: "H.264",
      duration: 42.8,
      creationTimestamp: "2026-01-22T03:14:00Z",
      modificationTimestamp: "2026-01-24T11:02:33Z",
      software: "FFmpeg 6.1",
      exifStatus: "absent",
      c2pa: { status: "not-present" },
    },
  },
];

export const HISTORY_ANALYSES: AnalysisResult[] = [
  DEMO_ANALYSES[0],
  DEMO_ANALYSES[1],
  DEMO_ANALYSES[2],
  DEMO_ANALYSES[3],
  {
    id: "IMG-2026-00009",
    mediaType: "image",
    filename: "press_release_screenshot.png",
    verdict: "manipulated",
    confidence: 89,
    confidenceInterval: { lower: 85, upper: 92 },
    explanation: "Multiple independent forensic signals indicate likely synthetic or manipulated content.",
    signals: [
      makeSignal("spatial", "Spatial Artifacts", 0.84, 0.93, "high", "Splicing seam detected across document boundary.", []),
      makeSignal("frequency", "Frequency Domain", 0.72, 0.89, "high", "JPEG error level inconsistencies.", []),
      makeSignal("metadata", "Metadata / Provenance", 0.66, 0.91, "medium", "File assembled from three separate captures.", ["Embedded thumbnail predates main image"]),
    ],
    status: "complete",
    createdAt: isoAgo(1.5),
    processingTime: 5,
  },
  {
    id: "AUD-2026-00062",
    mediaType: "audio",
    filename: "customer_service_call.m4a",
    verdict: "authentic",
    confidence: 91,
    confidenceInterval: { lower: 88, upper: 94 },
    explanation: "Multiple independent forensic signals found no consistent indication of synthetic generation or content manipulation.",
    signals: [makeSignal("voice-spectral", "Voice Spectral Analysis", 0.14, 0.94, "low", "Natural prosody and formant variation.", [])],
    status: "complete",
    createdAt: isoAgo(7.2),
    processingTime: 9,
  },
  {
    id: "VID-2026-00139",
    mediaType: "video",
    filename: "townhall_clip.mp4",
    verdict: "suspicious",
    confidence: 74,
    confidenceInterval: { lower: 69, upper: 79 },
    explanation: "A subset of forensic signals deviate from expected baselines. Human review is recommended.",
    signals: [makeSignal("temporal", "Temporal Consistency", 0.7, 0.88, "high", "Scene cut conceals identity swap region.", [])],
    status: "review",
    createdAt: isoAgo(12.0),
    processingTime: 21,
  },
  {
    id: "IMG-2026-00003",
    mediaType: "image",
    filename: "product_photo_04.jpg",
    verdict: "authentic",
    confidence: 96,
    confidenceInterval: { lower: 93, upper: 97 },
    explanation: "Multiple independent forensic signals found no consistent indication of synthetic generation.",
    signals: [makeSignal("metadata", "Metadata / Provenance", 0.05, 0.98, "low", "Full C2PA manifest verified.", ["C2PA verified: signed by camera vendor chain"])],
    metadata: {
      filename: "product_photo_04.jpg",
      mimeType: "image/jpeg",
      fileSize: 2_118_442,
      dimensions: { width: 4500, height: 4500 },
      codec: "JPEG",
      creationTimestamp: "2026-01-30T08:00:00Z",
      modificationTimestamp: "2026-01-30T08:00:05Z",
      software: "Canon EOS R5",
      exifStatus: "present",
      c2pa: { status: "verified" },
      camera: "RF 85mm F1.2 L USM",
    },
    status: "complete",
    createdAt: isoAgo(20),
    processingTime: 4,
  },
  {
    id: "AUD-2026-00054",
    mediaType: "audio",
    filename: "voicemail_clip.wav",
    verdict: "inconclusive",
    confidence: 45,
    confidenceInterval: { lower: 38, upper: 52 },
    explanation: "Available signals were insufficient to reach a confident assessment.",
    signals: [makeSignal("voice-spectral", "Voice Spectral Analysis", 0.5, 0.7, "medium", "Heavy telephony compression reduces signal quality.", [])],
    status: "complete",
    createdAt: isoAgo(30),
    processingTime: 8,
  },
  {
    id: "VID-2026-00118",
    mediaType: "video",
    filename: "podcast_guest.mp4",
    verdict: "authentic",
    confidence: 88,
    confidenceInterval: { lower: 84, upper: 91 },
    explanation: "Multiple independent forensic signals found no consistent indication of synthetic generation.",
    signals: [makeSignal("av-sync", "Audio / Visual Sync", 0.08, 0.95, "low", "Lip-sync within natural tolerance.", [])],
    status: "complete",
    createdAt: isoAgo(49),
    processingTime: 19,
  },
  {
    id: "IMG-2026-00227",
    mediaType: "image",
    filename: "event_banner.png",
    verdict: "suspicious",
    confidence: 68,
    confidenceInterval: { lower: 63, upper: 73 },
    explanation: "A subset of forensic signals deviate from expected baselines.",
    signals: [makeSignal("spatial", "Spatial Artifacts", 0.61, 0.86, "medium", "Text region upscaling artifacts detected.", [])],
    status: "review",
    createdAt: isoAgo(60),
    processingTime: 5,
  },
  {
    id: "AUD-2026-00041",
    mediaType: "audio",
    filename: "press_briefing.wav",
    verdict: "manipulated",
    confidence: 93,
    confidenceInterval: { lower: 90, upper: 95 },
    explanation: "Multiple independent forensic signals indicate likely synthetic or manipulated content.",
    signals: [makeSignal("voice-spectral", "Voice Spectral Analysis", 0.93, 0.96, "high", "Two vocoder stitched segments identified.", [])],
    status: "complete",
    createdAt: isoAgo(3.1),
    processingTime: 12,
  },
  {
    id: "VID-2026-00102",
    mediaType: "video",
    filename: "user_generated_08.mp4",
    verdict: "authentic",
    confidence: 85,
    confidenceInterval: { lower: 81, upper: 89 },
    explanation: "Multiple independent forensic signals found no consistent indication of synthetic generation.",
    signals: [makeSignal("spatial", "Spatial Artifacts", 0.12, 0.91, "low", "Sensor noise pattern intact.", [])],
    status: "complete",
    createdAt: isoAgo(75),
    processingTime: 16,
  },
  {
    id: "IMG-2026-00190",
    mediaType: "image",
    filename: "identity_document.png",
    verdict: "manipulated",
    confidence: 95,
    confidenceInterval: { lower: 92, upper: 97 },
    explanation: "Multiple independent forensic signals indicate likely synthetic or manipulated content.",
    signals: [makeSignal("spatial", "Spatial Artifacts", 0.92, 0.97, "high", "Document composite with cloned background.", [])],
    status: "complete",
    createdAt: isoAgo(2.4),
    processingTime: 6,
  },
];

export const DEMO_ANALYSIS_BY_ID: Record<string, AnalysisResult> = {
  [DEMO_ANALYSES[0].id]: DEMO_ANALYSES[0],
  [DEMO_ANALYSES[1].id]: DEMO_ANALYSES[1],
  [DEMO_ANALYSES[2].id]: DEMO_ANALYSES[2],
  [DEMO_ANALYSES[3].id]: DEMO_ANALYSES[3],
};
