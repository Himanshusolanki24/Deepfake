"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Play, Pause, Volume2, AudioLines, Film, Image as ImageIcon } from "lucide-react";
import type { MediaFile } from "@/types/media";
import type { UploadedEntry } from "./MediaDropzone";
import { formatBytes, formatSeconds } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MediaPreview({ entry }: { entry: UploadedEntry }) {
  const { file } = entry;
  if (file.type === "image") return <ImagePreview entry={entry} />;
  if (file.type === "video") return <VideoPreview entry={entry} />;
  return <AudioPreview entry={entry} />;
}

function ImagePreview({ entry }: { entry: UploadedEntry }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-black/90 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.objectUrl}
        alt={`Preview of ${entry.file.filename}`}
        className="max-h-[420px] max-w-full rounded object-contain"
      />
      <FileBadge label={entry.file.filename} type="image" />
    </div>
  );
}

function VideoPreview({ entry }: { entry: UploadedEntry }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-black/90">
      <video src={entry.objectUrl} controls className="max-h-[420px] w-full" />
      <FileBadge label={entry.file.filename} type="video" />
    </div>
  );
}

function AudioPreview({ entry }: { entry: UploadedEntry }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars = Array.from({ length: 48 }, (_, i) =>
    0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + (entry.file.id.length % 5) * 0.6))
  );

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current?.remove();
      audioRef.current = null;
    };
  }, [entry.objectUrl]);

  const getAudio = () => {
    if (audioRef.current) return audioRef.current;
    const el = new Audio(entry.objectUrl);
    el.addEventListener("loadedmetadata", () => setDuration(el.duration));
    el.addEventListener("timeupdate", () => setCurrent(el.currentTime));
    el.addEventListener("ended", () => setPlaying(false));
    audioRef.current = el;
    return el;
  };

  const toggle = () => {
    const audio = getAudio();
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <Button size="icon" variant="secondary" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <div className="flex h-20 items-center gap-[3px]" aria-hidden="true">
            {bars.map((h, i) => {
              const active = duration ? i / bars.length <= current / duration : false;
              return (
                <motion.div
                  key={i}
                  className="flex-1 rounded-sm bg-info/70"
                  animate={{ height: `${h * 100}%`, opacity: active ? 1 : 0.4 }}
                  transition={{ duration: 0.3 }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="hex-mono text-[11px] text-muted-foreground tabular">
              {formatSeconds(current)} / {duration ? formatSeconds(duration) : "--:--"}
            </span>
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
      <FileBadge label={entry.file.filename} type="audio" />
    </div>
  );
}

function FileBadge({ label, type }: { label: string; type: string }) {
  const Icon = type === "video" ? Film : type === "audio" ? AudioLines : ImageIcon;
  return (
    <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur">
      <Icon className="h-3 w-3" />
      <span className="max-w-[180px] truncate">{label}</span>
    </div>
  );
}

export function UploadSummary({ entry }: { entry: UploadedEntry }) {
  const { file } = entry;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
      <SummaryItem label="Filename" value={file.filename} mono />
      <SummaryItem label="Type" value={file.mimeType} mono />
      <SummaryItem label="Size" value={formatBytes(file.size)} mono />
      <SummaryItem label="Format" value={file.type.toUpperCase()} mono />
    </dl>
  );
}

function SummaryItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={mono ? "hex-mono truncate text-[13px] text-foreground" : "truncate text-[13px] text-foreground"}>
        {value}
      </dd>
    </div>
  );
}

export function analyzeFileObject(entry: UploadedEntry): MediaFile {
  return entry.file;
}
