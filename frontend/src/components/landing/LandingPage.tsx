"use client";

import { LandingNavbar } from "./LandingNavbar";
import { HeroSection } from "./HeroSection";
import { ProblemSection } from "./ProblemSection";
import { SignalFusionSection } from "./SignalFusionSection";
import { EvidenceSection } from "./EvidenceSection";
import { ExplainEvidenceSection } from "./ExplainEvidenceSection";
import { FrequencySection } from "./FrequencySection";
import { VideoForensicsSection } from "./VideoForensicsSection";
import { AudioForensicsSection } from "./AudioForensicsSection";
import { ProvenanceSection } from "./ProvenanceSection";
import { ProductPreviewSection } from "./ProductPreviewSection";
import { UseCasesSection } from "./UseCasesSection";
import { TechnologySection } from "./TechnologySection";
import { ResponsibleAISection } from "./ResponsibleAISection";
import { FinalCTA } from "./FinalCTA";
import { LandingFooter } from "./LandingFooter";

export function LandingPage() {
  return (
    <div className="min-h-[100svh] bg-[#F7F8FA] text-[#111827]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>
      <LandingNavbar />
      <main id="main-content">
        <HeroSection />
        <ProblemSection />
        <SignalFusionSection />
        <EvidenceSection />
        <ExplainEvidenceSection />
        <FrequencySection />
        <VideoForensicsSection />
        <AudioForensicsSection />
        <ProvenanceSection />
        <ProductPreviewSection />
        <UseCasesSection />
        <TechnologySection />
        <ResponsibleAISection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}