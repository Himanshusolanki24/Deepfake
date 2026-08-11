export type MediaType = "image" | "video" | "audio";

export type AnalysisStatus =
  | "queued"
  | "processing"
  | "complete"
  | "failed"
  | "review";

export interface MediaFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  type: MediaType;
  duration?: number;
  dimensions?: { width: number; height: number };
  previewUrl?: string;
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
};

export const ACCEPTED_MEDIA_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".mp4",
  ".mov",
  ".avi",
  ".mp3",
  ".wav",
  ".m4a",
] as const;

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export const ACCEPTED_MIME_TYPES: Record<MediaType, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/quicktime", "video/x-msvideo"],
  audio: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a"],
};

export function detectMediaType(filename: string, mimeType?: string): MediaType {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "avi"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a"].includes(ext)) return "audio";
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
  }
  return "image";
}
