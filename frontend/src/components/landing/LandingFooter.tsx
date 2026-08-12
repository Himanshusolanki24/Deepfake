import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const COLUMNS = [
  {
    label: "Product",
    links: [
      { label: "Product", href: "#product" },
      { label: "Technology", href: "#technology" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Research", href: "#research" },
    ],
  },
  {
    label: "Platform",
    links: [
      { label: "Analyze", href: "/analyze" },
      { label: "Workspace", href: "/workspace" },
      { label: "Evidence", href: "/evidence" },
      { label: "API", href: "/api" },
      { label: "Documentation", href: "/api" },
    ],
  },
  {
    label: "Trust",
    links: [
      { label: "Privacy", href: "/settings" },
      { label: "Security", href: "/settings" },
      { label: "Responsible AI", href: "#research" },
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-[#e5e7eb] bg-[#F7F8FA]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#dbe2ec] bg-white shadow-sm">
                <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
              </span>
              <span className="text-[13px] font-semibold tracking-[0.18em] text-[#111827]">
                AUTHENTIQ
              </span>
            </div>
            <p className="landing-mono mt-3 text-[9px] font-medium uppercase tracking-[0.22em] text-slate-400">
              Digital Media Forensics
            </p>
            <p className="mt-4 max-w-xs text-[13px] leading-6 text-slate-500">
              Explainable multi-signal authenticity verification for images,
              video and audio.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.label} aria-label={col.label}>
              <p className="landing-mono text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                {col.label.toUpperCase()}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-slate-600 transition-colors hover:text-[#111827]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-baseline justify-between gap-3 border-t border-[#e5e7eb] pt-6 sm:flex-row sm:items-center">
          <p className="landing-mono text-[10px] tracking-[0.18em] text-slate-400">
            © 2026 AUTHENTIQ · DIGITAL MEDIA FORENSICS
          </p>
          <p className="landing-mono text-[10px] tracking-[0.18em] text-slate-400">
            VERIFY WHAT YOU SEE.
          </p>
        </div>
      </div>
    </footer>
  );
}