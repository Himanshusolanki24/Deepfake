import { ShieldCheck } from "lucide-react";

export function AuthBrand({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border bg-[#111a2e] shadow-sm">
          <ShieldCheck className="h-5 w-5 text-[#7fb4ff]" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-[0.18em] text-white">AUTHENTIQ</p>
          <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-sidebar-muted">
            Digital Forensics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-sm">
        <ShieldCheck className="h-6 w-6 text-[#7fb4ff]" />
      </div>
      <div className="leading-tight">
        <p className="text-xl font-semibold tracking-[0.18em] text-white">AUTHENTIQ</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.28em] text-sidebar-muted">
          Digital Forensics
        </p>
      </div>
    </div>
  );
}
