"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface PasswordStrengthResult {
  score: number; // 0-4
  label: string;
  color: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too weak", color: "#dc2626" },
    1: { label: "Weak", color: "#dc2626" },
    2: { label: "Fair", color: "#d97706" },
    3: { label: "Good", color: "#d97706" },
    4: { label: "Strong", color: "#16a34a" },
    5: { label: "Excellent", color: "#16a34a" },
  };

  return { score, ...map[Math.min(score, 5)] };
}

export function PasswordStrength({ password }: { password: string }) {
  const { score, label, color } = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full bg-border transition-colors"
            style={i < score ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

export function PasswordRequirements({ password }: { password: string }) {
  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Uppercase letter (A-Z)", ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter (a-z)", ok: /[a-z]/.test(password) },
    { label: "Number (0-9)", ok: /[0-9]/.test(password) },
    { label: "Special character (!@#…)", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={cn(
            "flex items-center gap-1.5 text-[11px]",
            rule.ok ? "text-authentic" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold",
              rule.ok ? "bg-authentic-soft text-authentic" : "bg-muted text-muted-foreground"
            )}
            aria-hidden="true"
          >
            {rule.ok ? "✓" : "•"}
          </span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
