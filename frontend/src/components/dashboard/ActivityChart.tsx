"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DATA = [
  { day: "Mon", analyses: 42, suspicious: 11 },
  { day: "Tue", analyses: 51, suspicious: 13 },
  { day: "Wed", analyses: 38, suspicious: 9 },
  { day: "Thu", analyses: 64, suspicious: 18 },
  { day: "Fri", analyses: 58, suspicious: 15 },
  { day: "Sat", analyses: 33, suspicious: 6 },
  { day: "Sun", analyses: 47, suspicious: 10 },
];

export function ActivityChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Analysis Activity</CardTitle>
        <p className="text-xs text-muted-foreground">Last 7 days · all media types</p>
      </CardHeader>
      <CardContent className="h-[260px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="gaTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gaSusp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-manipulated)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-manipulated)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
              }}
            />
            <Area
              type="monotone"
              dataKey="analyses"
              name="Analyses"
              stroke="var(--color-info)"
              strokeWidth={2}
              fill="url(#gaTotal)"
            />
            <Area
              type="monotone"
              dataKey="suspicious"
              name="Suspicious"
              stroke="var(--color-manipulated)"
              strokeWidth={2}
              fill="url(#gaSusp)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
