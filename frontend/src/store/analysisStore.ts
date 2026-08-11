import { create } from "zustand";
import type { AnalysisResult } from "@/types/analysis";
import type { MediaFile } from "@/types/media";

export interface PendingEntry {
  file: MediaFile;
  objectUrl: string;
}

interface AnalysisState {
  currentFile: MediaFile | null;
  currentResult: AnalysisResult | null;
  batchFiles: MediaFile[];
  pendingEntries: PendingEntry[];
  setCurrentFile: (file: MediaFile | null) => void;
  setCurrentResult: (result: AnalysisResult | null) => void;
  setPendingEntries: (entries: PendingEntry[]) => void;
  addBatchFile: (file: MediaFile) => void;
  removeBatchFile: (id: string) => void;
  clearBatch: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentFile: null,
  currentResult: null,
  batchFiles: [],
  pendingEntries: [],
  setCurrentFile: (currentFile) => set({ currentFile }),
  setCurrentResult: (currentResult) => set({ currentResult }),
  setPendingEntries: (pendingEntries) => set({ pendingEntries }),
  addBatchFile: (batchFile) => set((s) => ({ batchFiles: [...s.batchFiles, batchFile] })),
  removeBatchFile: (id) => set((s) => ({ batchFiles: s.batchFiles.filter((f) => f.id !== id) })),
  clearBatch: () => set({ batchFiles: [] }),
}));
