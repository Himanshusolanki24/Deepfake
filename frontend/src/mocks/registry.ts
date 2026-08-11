import type { AnalysisResult } from "@/types/analysis";

const registry = new Map<string, AnalysisResult>();

export function registerAnalysis(result: AnalysisResult): void {
  registry.set(result.id, result);
}

export function lookupRegisteredAnalysis(id: string): AnalysisResult | undefined {
  return registry.get(id);
}

export function listRegisteredAnalyses(): AnalysisResult[] {
  return [...registry.values()];
}
