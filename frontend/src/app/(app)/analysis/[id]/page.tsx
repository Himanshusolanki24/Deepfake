import type { Metadata } from "next";
import { AnalysisDetailView } from "@/components/analysis/AnalysisDetailView";

export const metadata: Metadata = {
  title: "Analysis",
  description: "Forensic authenticity assessment with evidence.",
};

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnalysisDetailView id={id} />;
}
