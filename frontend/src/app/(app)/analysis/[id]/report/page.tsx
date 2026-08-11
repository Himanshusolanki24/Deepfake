import type { Metadata } from "next";
import { ReportView } from "@/components/analysis/ReportView";

export const metadata: Metadata = {
  title: "Report",
  description: "Forensic assessment report.",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportView id={id} />;
}
