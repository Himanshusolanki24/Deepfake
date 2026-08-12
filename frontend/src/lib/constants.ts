import { ACCEPTED_MEDIA_EXTENSIONS } from "@/types/media";

export const SUPPORTED_FORMATS: string[] = ACCEPTED_MEDIA_EXTENSIONS.map((ext) =>
  ext.replace(".", "").toUpperCase()
);

export const PROCESSING_STEPS = [
  "Media ingestion",
  "File integrity verification",
  "Frame extraction",
  "Face detection",
  "Spatial artifact analysis",
  "Frequency-domain analysis",
  "Temporal consistency",
  "Metadata inspection",
  "Evidence fusion",
] as const;

export const DEFAULT_SIGNALS = [
  { id: "spatial", label: "Spatial artifacts", description: "Texture, blending and GAN fingerprint detection" },
  { id: "frequency", label: "Frequency analysis", description: "Spectral anomalies and recompression artifacts" },
  { id: "temporal", label: "Temporal consistency", description: "Motion, micro-expression and frame coherence" },
  { id: "physiological", label: "Physiological signals", description: "Pulse proxy and skin-tone dynamics" },
  { id: "av-sync", label: "Audio-visual synchronization", description: "Lip-sync and cross-modal alignment" },
  { id: "metadata", label: "Metadata & provenance", description: "EXIF, C2PA credentials and edit chain" },
] as const;

export const AUDIO_SIGNALS = [
  { id: "voice-spectral", label: "Voice spectral analysis", description: "Vocoder fingerprints and formant trajectories" },
] as const;

export type SignalCategory = "visual" | "temporal" | "crossmodal" | "provenance" | "audio";

export const SIGNAL_CATEGORIES: Record<SignalCategory, { label: string; description: string }> = {
  visual: { label: "Visual Forensics", description: "Pixel-level and spectral image artifacts" },
  temporal: { label: "Temporal Forensics", description: "Motion, coherence and physiological dynamics" },
  crossmodal: { label: "Cross-Modal Forensics", description: "Audio-visual alignment and synchronization" },
  provenance: { label: "Provenance & Metadata", description: "Edit chains, credentials and content provenance" },
  audio: { label: "Audio Forensics", description: "Spectral and vocoder analysis of audio" },
};

export const SIGNAL_TO_CATEGORY: Record<string, SignalCategory> = {
  spatial: "visual",
  frequency: "visual",
  compression: "visual",
  "ai-generated": "visual",
  lighting: "visual",
  temporal: "temporal",
  physiological: "temporal",
  "face-tracking": "temporal",
  "av-sync": "crossmodal",
  metadata: "provenance",
  "voice-spectral": "audio",
  "speech-synthetic": "audio",
};

export const ANALYSIS_STEP_DURATION_MS = 850;

export const NETWORK_LATENCY_MS = 350;

export const LEGAL_COPY =
  "Analysis results are probabilistic forensic assessments, not determinations of absolute truth. Verdicts reflect calibrated confidence based on available signals.";

export const PRIVACY_COPY =
  "Uploaded media is encrypted during processing and is not publicly accessible. Files are retained only for the duration required to complete the assessment.";
