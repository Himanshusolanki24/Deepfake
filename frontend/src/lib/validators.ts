import { z } from "zod";
import {
  ACCEPTED_MEDIA_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  detectMediaType,
} from "@/types/media";

export const uploadFileSchema = z.object({
  name: z.string().min(1, "Filename is required."),
  size: z
    .number()
    .max(MAX_FILE_SIZE_BYTES, "Maximum file size is 500 MB."),
});

export function validateUploadFile(file: File): {
  ok: boolean;
  error?: string;
} {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ACCEPTED_MEDIA_EXTENSIONS.includes(ext as (typeof ACCEPTED_MEDIA_EXTENSIONS)[number])) {
    return { ok: false, error: "This file format isn't supported." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "This file exceeds the 500 MB maximum size." };
  }
  if (file.size === 0) {
    return { ok: false, error: "This file appears to be empty." };
  }
  return { ok: true };
}

export function fileToMediaFile(file: File) {
  const type = detectMediaType(file.name, file.type);
  return {
    id: crypto.randomUUID(),
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    type,
  };
}
