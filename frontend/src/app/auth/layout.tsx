import Link from "next/link";
import { AuthBrand } from "@/components/auth/AuthBrand";

const FEATURES = [
  {
    title: "Multi-signal forensics",
    body: "Spatial, spectral, temporal, physiological and provenance analysis in a single pipeline.",
  },
  {
    title: "Calibrated confidence",
    body: "Every verdict carries an uncertainty interval, not just a single number.",
  },
  {
    title: "Evidence you can trace",
    body: "Heatmaps, suspicious frames and frequency plots are preserved for every assessment.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[440px] shrink-0 flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(127,180,255,0.18), transparent 45%), radial-gradient(circle at 80% 90%, rgba(37,99,235,0.15), transparent 50%)",
          }}
          aria-hidden="true"
        />
        <AuthBrand />

        <div className="relative space-y-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="space-y-1">
              <p className="text-sm font-semibold text-white">{feature.title}</p>
              <p className="text-[13px] leading-6 text-sidebar-muted">{feature.body}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <p className="text-[11px] leading-5 text-sidebar-muted">
            Verdicts reflect calibrated confidence based on available signals — not absolute truth.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex text-xs font-medium text-[#7fb4ff] hover:underline"
          >
            ← Back to AUTHENTIQ
          </Link>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-background px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
