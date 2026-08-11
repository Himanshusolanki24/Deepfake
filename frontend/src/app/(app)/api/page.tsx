"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  KeyRound,
  Plus,
  Copy,
  Trash2,
  Activity,
  CheckCircle2,
  Timer,
  Gauge,
  FileCode2,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { maskKey } from "@/lib/utils";

const METRICS = [
  { label: "Requests", value: "24,813", delta: "+18%", icon: Activity, tone: "text-info", spark: [40, 45, 43, 52, 58, 54, 66] },
  { label: "Success rate", value: "99.2%", delta: "+0.3%", icon: CheckCircle2, tone: "text-authentic", spark: [96, 97, 98, 98, 99, 99, 99] },
  { label: "Avg latency", value: "412 ms", delta: "-8%", icon: Timer, tone: "text-suspicious", spark: [480, 460, 450, 440, 430, 420, 412] },
  { label: "Remaining quota", value: "75%", delta: "-25%", icon: Gauge, tone: "text-suspicious", spark: [92, 88, 84, 80, 78, 76, 75] },
] as const;

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  active: boolean;
}

const INITIAL_KEYS: ApiKey[] = [
  { id: "k1", name: "Production", key: "authentiq-live-key-placeholder-002", created: "2026-01-15", lastUsed: "2 min ago", active: true },
  { id: "k2", name: "Staging", key: "authentiq-live-key-placeholder-003", created: "2026-02-02", lastUsed: "3 hr ago", active: true },
  { id: "k3", name: "Analytics", key: "authentiq-live-key-placeholder-004", created: "2026-03-11", lastUsed: "1 day ago", active: false },
];

const ENDPOINTS = [
  { method: "POST", path: "/analyze/image", desc: "Run authenticity assessment on an image" },
  { method: "POST", path: "/analyze/video", desc: "Run authenticity assessment on a video" },
  { method: "POST", path: "/analyze/audio", desc: "Run authenticity assessment on audio" },
  { method: "GET", path: "/analysis/{id}", desc: "Retrieve a completed analysis" },
  { method: "GET", path: "/analysis/{id}/progress", desc: "Poll live pipeline progress" },
  { method: "GET", path: "/analysis/history", desc: "List historical analyses" },
  { method: "POST", path: "/analysis/batch", desc: "Submit a batch analysis queue" },
  { method: "GET", path: "/analysis/{id}/report", desc: "Generate a forensic report" },
] as const;

export default function ApiDashboardPage() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const createKey = () => {
    const name = newKeyName.trim() || "Untitled key";
    const value = `sk_live_${Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join("")}`;
    setKeys((prev) => [
      { id: crypto.randomUUID(), name, key: value, created: new Date().toISOString().slice(0, 10), lastUsed: "never", active: true },
      ...prev,
    ]);
    setNewKeyName("");
    setCreateOpen(false);
    setNewKeyValue(value);
  };

  const revokeKey = (id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: false } : k)));
    toast.success("API key revoked");
  };

  const copyKey = (key: string) => {
    void navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Platform API"
        title="API Dashboard"
        description="Monitor usage, manage access keys and review the forensic engine API."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create API Key
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                  <Icon className={`h-4 w-4 ${m.tone}`} />
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="hex-mono text-2xl font-semibold tabular text-foreground">{m.value}</span>
                  <span className={m.delta.startsWith("-") ? "text-[11px] font-medium text-authentic" : "text-[11px] font-medium text-suspicious"}>{m.delta}</span>
                </div>
                <div className="mt-3 flex items-end gap-1">
                  {m.spark.map((v, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${v}%` }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="w-full rounded-sm bg-secondary"
                      style={{ height: `${(v / 100) * 40}px` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-info" />
            API Keys
          </CardTitle>
          <CardDescription className="text-xs">Keys are scoped to your workspace and can be revoked at any time.</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Key</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last used</th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-medium text-foreground">{k.name}</td>
                      <td className="px-3 py-3">
                        <span className="hex-mono flex items-center gap-2 text-[12px] text-muted-foreground">
                          {maskKey(k.key)}
                          <button
                            onClick={() => copyKey(k.key)}
                            className="rounded p-0.5 hover:bg-muted"
                            aria-label={`Copy key for ${k.name}`}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground tabular">{k.created}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground tabular">{k.lastUsed}</td>
                      <td className="px-3 py-3">
                        {k.active ? (
                          <Badge variant="authentic" className="normal-case">Active</Badge>
                        ) : (
                          <Badge variant="inconclusive" className="normal-case">Revoked</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {k.active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-manipulated hover:text-manipulated"
                            onClick={() => revokeKey(k.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileCode2 className="h-4 w-4 text-info" />
            API Reference
          </CardTitle>
          <CardDescription className="text-xs">
            Base URL <code className="hex-mono rounded bg-muted px-1.5 py-0.5 text-[11px]">{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {ENDPOINTS.map((e) => (
              <div key={e.path} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                <span
                  className={`hex-mono w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold uppercase ${
                    e.method === "GET" ? "bg-info-soft text-info" : "bg-authentic-soft text-authentic"
                  }`}
                >
                  {e.method}
                </span>
                <code className="hex-mono text-[12px] text-foreground">{e.path}</code>
                <span className="text-xs text-muted-foreground sm:ml-auto">{e.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Monthly quota</CardTitle>
          <CardDescription className="text-xs">Standard plan · resets on the 1st</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={75} className="h-2 flex-1" fill="var(--color-suspicious)" />
            <span className="hex-mono text-sm font-semibold tabular text-foreground">18,750 / 25,000</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Name your key so you can identify it in logs and dashboards.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="key-name">Key name</Label>
            <Input id="key-name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Production, CI pipeline…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createKey}>Create key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newKeyValue !== null} onOpenChange={() => setNewKeyValue(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy your new API key</DialogTitle>
            <DialogDescription>This key is shown only once. Store it securely.</DialogDescription>
          </DialogHeader>
          {newKeyValue && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5">
              <code className="hex-mono flex-1 truncate text-[12px] text-foreground">{newKeyValue}</code>
              <Button size="icon-sm" variant="outline" onClick={() => copyKey(newKeyValue!)} aria-label="Copy new key">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setNewKeyValue(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
