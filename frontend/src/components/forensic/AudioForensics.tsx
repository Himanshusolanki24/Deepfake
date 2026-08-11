"use client";

import type { AnalysisResult } from "@/types/analysis";
import { WaveformCanvas, SpectrogramCanvas, AudioTimelineStrip } from "./AudioWaveform";
import { SignalBreakdown } from "@/components/analysis/SignalBreakdown";
import { cn } from "@/lib/utils";

export function AudioForensics({ result }: { result: AnalysisResult }) {
  const analysis = result.audioAnalysis;
  if (!analysis) return null;
  const duration = result.metadata?.duration ?? 31;

  const rows = [
    { label: "Spectral consistency", score: analysis.spectralConsistency, note: "Formant coherence across frames" },
    { label: "Prosody", score: analysis.prosody, note: "Pitch, rhythm and stress patterns" },
    { label: "Pitch naturalness", score: analysis.pitchNaturalness, note: "Fundamental frequency trajectories" },
    { label: "Vocoder artifacts", score: analysis.vocoderArtifacts, note: "Neural vocoder phase fingerprints" },
    { label: "Breath / mouth noise", score: analysis.breathNoise, note: "Natural respiratory markers" },
  ];

  const tone = (score: number) =>
    score >= 0.7 ? "text-manipulated" : score >= 0.45 ? "text-suspicious" : "text-authentic";
  const barColor = (score: number) =>
    score >= 0.7
      ? "var(--color-manipulated)"
      : score >= 0.45
        ? "var(--color-suspicious)"
        : "var(--color-authentic)";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Waveform Analysis</h3>
            <p className="text-xs text-muted-foreground">
              Red segments indicate detected spectral anomalies
            </p>
          </div>
          <span className="hex-mono text-[10px] text-muted-foreground tabular">
            {result.filename} · {duration.toFixed(1)}s
          </span>
        </div>
        <WaveformCanvas duration={duration} seed={42} segments={analysis.suspiciousSegments} />
        <SpectrogramCanvas seed={42} height={130} />
        <AudioTimelineStrip
          duration={duration}
          segments={analysis.suspiciousSegments}
          onSelect={() => {}}
          selected={null}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Signal Breakdown</h3>
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">{row.label}</span>
                <span className={cn("hex-mono text-[13px] font-semibold tabular", tone(row.score))}>
                  {row.score.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${row.score * 100}%`, backgroundColor: barColor(row.score) }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{row.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Forensic Signal Evidence</h3>
        <SignalBreakdown signals={result.signals} />
      </div>
    </div>
  );
}
