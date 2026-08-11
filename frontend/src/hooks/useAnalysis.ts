"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AnalysisResult } from "@/types/analysis";
import type { MediaFile } from "@/types/media";
import { api, mockAnalyzeToId } from "@/lib/api";
import { buildUploadedResult } from "@/mocks/resultFactory";

export function useHistory() {
  return useQuery<AnalysisResult[]>({
    queryKey: ["history"],
    queryFn: () => api.getHistory(),
    staleTime: 60_000,
  });
}

export function useAnalysis(id: string) {
  return useQuery<AnalysisResult>({
    queryKey: ["analysis", id],
    queryFn: () => api.getAnalysis(id),
    enabled: !!id,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useStartAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      signals,
    }: {
      file: MediaFile;
      signals: string[];
    }) => {
      const id = await api
        .analyzeMedia(file.type, {
          name: file.filename,
          size: file.size,
          type: file.mimeType,
        }, signals)
        .then((r) => r.id);
      return { id, result: buildUploadedResult(file, id, signals) };
    },
    onSuccess: ({ result }) => {
      queryClient.setQueryData<AnalysisResult[]>(["history"], (old) =>
        old ? [result, ...old] : [result]
      );
      queryClient.setQueryData(["analysis", result.id], result);
    },
  });
}

export function useGenerateBatchResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, signals }: { file: MediaFile; signals: string[] }) => {
      const id = mockAnalyzeToId(file.filename);
      const result = buildUploadedResult(file, id, signals);
      return { id, result };
    },
    onSuccess: ({ result }) => {
      queryClient.setQueryData<AnalysisResult[]>(["history"], (old) =>
        old ? [result, ...old] : [result]
      );
      queryClient.setQueryData(["analysis", result.id], result);
    },
  });
}

export function useMediaObjectUrl(blob?: Blob | null): string | undefined {
  const [state, setState] = useState<{ blob: Blob | null; url?: string }>(() => ({
    blob: blob ?? null,
    url: blob ? URL.createObjectURL(blob) : undefined,
  }));
  const nextBlob = blob ?? null;
  if (state.blob !== nextBlob) {
    setState((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return {
        blob: nextBlob,
        url: nextBlob ? URL.createObjectURL(nextBlob) : undefined,
      };
    });
  }
  return state.url;
}
