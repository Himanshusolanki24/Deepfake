import type { AnalysisResult } from "@/types/analysis";
import type { MediaType } from "@/types/media";
import { DEMO_ANALYSIS_BY_ID, HISTORY_ANALYSES } from "@/mocks/analyses";
import { listRegisteredAnalyses, lookupRegisteredAnalysis } from "@/mocks/registry";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export interface ApiConfig {
  apiUrl: string;
  useMocks: boolean;
}

export const API_CONFIG: ApiConfig = {
  apiUrl: API_URL,
  useMocks: USE_MOCKS,
};

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "UNKNOWN_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new ApiError(
        res.status,
        payload?.detail ?? "Analysis service is temporarily unavailable.",
        payload?.code
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "Analysis is taking longer than expected.", "TIMEOUT");
    }
    throw new ApiError(503, "Analysis service is temporarily unavailable.", "SERVICE_UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}

export interface AnalysisProgressEvent {
  step: string;
  status: "pending" | "active" | "done";
  detail?: string;
  progress: number;
}

export const ANALYSIS_STEPS = [
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

export const api = {
  async getAnalysis(id: string): Promise<AnalysisResult> {
    if (USE_MOCKS) {
      await delay(350);
      const registered = lookupRegisteredAnalysis(id);
      const result = registered ?? DEMO_ANALYSIS_BY_ID[id];
      if (!result) throw new ApiError(404, "Analysis not found.", "NOT_FOUND");
      return result;
    }
    return request<AnalysisResult>(`/analysis/${id}`);
  },

  async getHistory(): Promise<AnalysisResult[]> {
    if (USE_MOCKS) {
      await delay(300);
      return [...listRegisteredAnalyses(), ...HISTORY_ANALYSES];
    }
    return request<AnalysisResult[]>("/analysis/history");
  },

  async analyzeMedia(
    mediaType: MediaType,
    file: { name: string; size: number; type: string },
    signals: string[]
  ): Promise<{ id: string }> {
    if (USE_MOCKS) {
      await delay(400);
      return { id: mockAnalyzeToId(file.name) };
    }
    return request<{ id: string }>(`/analyze/${mediaType}`, {
      method: "POST",
      body: { filename: file.name, size: file.size, mimeType: file.type, signals },
    });
  },

  async getAnalysisProgress(id: string): Promise<AnalysisProgressEvent[]> {
    if (USE_MOCKS) {
      await delay(200);
      const base = ANALYSIS_STEPS.slice(0, Math.floor(Math.random() * (ANALYSIS_STEPS.length - 2)) + 2);
      return base.map((step, i) => ({
        step,
        status: (i < base.length - 1 ? "done" : "active") as AnalysisProgressEvent["status"],
        progress: Math.round(((i + 1) / ANALYSIS_STEPS.length) * 100),
      }));
    }
    return request<AnalysisProgressEvent[]>(`/analysis/${id}/progress`);
  },

  async getBatchHistory(): Promise<AnalysisResult[]> {
    if (USE_MOCKS) {
      await delay(200);
      return HISTORY_ANALYSES.slice(0, 8);
    }
    return request<AnalysisResult[]>("/analysis/batch");
  },
};

export function mockAnalyzeToId(filename: string): string {
  const prefix = /\.(mp4|mov|avi)$/i.test(filename)
    ? "VID"
    : /\.(mp3|wav|m4a)$/i.test(filename)
      ? "AUD"
      : "IMG";
  const n = Math.floor(100 + Math.random() * 899);
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const USE_MOCKS_FLAG = USE_MOCKS;
