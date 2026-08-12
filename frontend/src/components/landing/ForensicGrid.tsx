interface ForensicGridProps {
  className?: string;
  ticks?: boolean;
  coords?: { x: string; y: string }[];
  label?: string;
}

export function ForensicGrid({ className = "", ticks = false, coords = [], label }: ForensicGridProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute -inset-[10%] forensic-grid opacity-70" />
      {ticks && (
        <>
          <span className="landing-mono absolute left-4 top-4 text-[10px] tracking-[0.2em] text-slate-400/70">
            {label ?? "FIELD GRID 1200mm"}
          </span>
          <span className="landing-mono absolute right-4 top-4 text-[10px] tracking-[0.2em] text-slate-400/70">
            SCALE 1:1
          </span>
          {[0, 25, 50, 75, 100].map((p) => (
            <span
              key={p}
              className="absolute left-0 h-px w-3 bg-slate-300/70"
              style={{ top: `${p}%` }}
            />
          ))}
          {[0, 25, 50, 75, 100].map((p) => (
            <span
              key={`v-${p}`}
              className="absolute top-0 h-3 w-px bg-slate-300/70"
              style={{ left: `${p}%` }}
            />
          ))}
        </>
      )}
      {coords.map((c) => (
        <span
          key={`${c.x}-${c.y}`}
          className="landing-mono absolute text-[9px] leading-none text-slate-400/80"
          style={{ left: c.x, top: c.y }}
        >
          +
        </span>
      ))}
    </div>
  );
}