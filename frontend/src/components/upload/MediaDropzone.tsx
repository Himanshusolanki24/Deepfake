"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "motion/react";
import {
  UploadCloud,
  FileWarning,
  FileVideo,
  FileAudio,
  FileImage,
  X,
  LockKeyhole,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { validateUploadFile } from "@/lib/validators";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";
import type { MediaFile } from "@/types/media";
import { MAX_FILE_SIZE_BYTES } from "@/types/media";
import { fileToMediaFile } from "@/lib/validators";
import { SUPPORTED_FORMATS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export interface UploadedEntry {
  file: MediaFile;
  blob: Blob;
  objectUrl: string;
}

interface MediaDropzoneProps {
  onFilesAccepted: (files: UploadedEntry[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  compact?: boolean;
  className?: string;
}

export function MediaDropzone({
  onFilesAccepted,
  multiple = false,
  maxFiles = 1,
  compact = false,
  className,
}: MediaDropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: File[]) => {
      const accepted: UploadedEntry[] = [];
      for (const file of files) {
        const validation = validateUploadFile(file);
        if (!validation.ok) {
          setError(validation.error ?? null);
          toast.error(validation.error);
          continue;
        }
        accepted.push({
          file: fileToMediaFile(file),
          blob: file,
          objectUrl: URL.createObjectURL(file),
        });
      }
      if (accepted.length) {
        setError(null);
        onFilesAccepted(multiple ? accepted : accepted.slice(0, maxFiles));
      }
    },
    [multiple, maxFiles, onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/x-msvideo": [".avi"],
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "audio/x-wav": [".wav"],
      "audio/mp4": [".m4a"],
      "audio/x-m4a": [".m4a"],
    },
    multiple,
    maxFiles,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card px-6 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40 focus-visible:ring-offset-2",
          isDragActive && "border-info bg-info-soft/50",
          compact ? "py-7" : "py-12",
          className
        )}
        role="button"
        aria-label="Upload media for analysis"
      >
        <input {...getInputProps()} />
        <motion.div
          animate={
            isDragActive ? { scale: 1.06, y: -2 } : { scale: 1, y: 0 }
          }
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className={cn(
            "flex items-center justify-center rounded-full border bg-muted transition-colors group-hover:border-info/30 group-hover:bg-info-soft/60",
            compact ? "h-10 w-10" : "h-14 w-14"
          )}
        >
          {isDragActive ? (
            <CheckCircle2 className={cn("text-info", compact ? "h-5 w-5" : "h-7 w-7")} />
          ) : (
            <UploadCloud
              className={cn(
                "text-muted-foreground transition-colors group-hover:text-info",
                compact ? "h-5 w-5" : "h-7 w-7"
              )}
            />
          )}
        </motion.div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {isDragActive ? "Drop to analyze" : "Drop image, video or audio here"}
          </p>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              or <span className="font-medium text-info underline underline-offset-2">browse your files</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1">
          {SUPPORTED_FORMATS.map((ext) => (
            <Badge key={ext} variant="muted" className="px-1.5 py-0 text-[9px] normal-case">
              {ext}
            </Badge>
          ))}
        </div>
        {!compact && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <LockKeyhole className="h-3 w-3" />
            Up to {formatBytes(MAX_FILE_SIZE_BYTES)} per file · encrypted during processing
          </p>
        )}
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-manipulated" role="alert">
          <FileWarning className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

export function MediaFileChip({
  entry,
  onRemove,
  index,
}: {
  entry: UploadedEntry;
  onRemove?: () => void;
  index: number;
}) {
  const Icon =
    entry.file.type === "video" ? FileVideo : entry.file.type === "audio" ? FileAudio : FileImage;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-xs">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{entry.file.filename}</p>
        <p className="hex-mono text-[11px] text-muted-foreground">
          {formatBytes(entry.file.size)} · {entry.file.mimeType}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-manipulated focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`Remove ${entry.file.filename}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <span className="hex-mono text-[10px] font-medium text-muted-foreground">
        #{String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );
}
