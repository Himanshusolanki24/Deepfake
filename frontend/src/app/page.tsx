import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Explainable Digital Media Authenticity Verification",
  description:
    "Multi-signal forensic analysis for images, video and audio with calibrated confidence and inspectable evidence.",
};

export default function HomePage() {
  return <LandingPage />;
}
