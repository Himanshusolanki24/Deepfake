"use client";

import { motion } from "motion/react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/common/sparkline";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta: number;
  description?: string;
  sparkline: number[];
  tone?: "info" | "authentic" | "suspicious" | "manipulated";
  color: string;
}

const toneClasses = {
  info: "text-info",
  authentic: "text-authentic",
  suspicious: "text-suspicious",
  manipulated: "text-manipulated",
} as const;

export function StatCard({
  label,
  value,
  delta,
  description,
  sparkline,
  tone = "info",
  color,
}: StatCardProps) {
  const positive = delta >= 0;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <span
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular",
              positive ? "bg-authentic-soft text-authentic" : "bg-manipulated-soft text-manipulated"
            )}
            title={`${positive ? "+" : ""}${delta}% this month`}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}
            {delta}%
          </span>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={cn("mt-2 text-[28px] font-semibold tabular leading-none tracking-tight", toneClasses[tone])}
        >
          {value}
        </motion.p>
        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
          {positive ? "Up" : "Down"} {Math.abs(delta)}% this month
        </p>
        <div className="mt-2 h-8">
          <Sparkline data={sparkline} color={color} />
        </div>
        {description && (
          <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
