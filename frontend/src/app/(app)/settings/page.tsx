"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, User, Radar, Bell, ShieldCheck, KeyRound, Lock, Check } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { maskKey } from "@/lib/utils";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  organization: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const DETECTION_SIGNALS = [
  { id: "spatial", label: "Spatial artifacts", desc: "Texture, blending and GAN fingerprint detection", on: true },
  { id: "frequency", label: "Frequency analysis", desc: "Spectral anomalies and recompression artifacts", on: true },
  { id: "temporal", label: "Temporal consistency", desc: "Motion and frame coherence", on: true },
  { id: "physiological", label: "Physiological signals", desc: "Pulse proxy and skin-tone dynamics", on: false },
  { id: "av-sync", label: "Audio-visual sync", desc: "Lip-sync and cross-modal alignment", on: true },
  { id: "metadata", label: "Metadata & provenance", desc: "EXIF, C2PA and edit chain", on: true },
];

export default function SettingsPage() {
  const [signals, setSignals] = useState(DETECTION_SIGNALS);
  const [notifications, setNotifications] = useState({
    analysisComplete: true,
    suspiciousAlert: true,
    systemUpdates: true,
    weeklyDigest: false,
    apiUsage: true,
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "Himanshu Solanki",
      email: "analyst@authentiq.dev",
      organization: "AUTHENTIQ Research",
    },
  });

  const saveProfile = (values: ProfileForm) => {
    void values;
    toast.success("Profile saved");
  };

  const toggleSignal = (id: string) => {
    setSignals((prev) => prev.map((s) => (s.id === id ? { ...s, on: !s.on } : s)));
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Workspace Preferences"
        title="Settings"
        description="Configure detection defaults, notifications, security and privacy."
      />

      <Tabs orientation="vertical" defaultValue="general" className="gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
          <TabsList className="flex h-auto w-full flex-row flex-wrap items-center justify-start gap-1 overflow-x-auto lg:w-48 lg:flex-col lg:justify-start lg:overflow-visible">
            <TabsTrigger value="general" className="lg:w-full lg:justify-start"><User className="h-3.5 w-3.5" /> General</TabsTrigger>
            <TabsTrigger value="detection" className="lg:w-full lg:justify-start"><Radar className="h-3.5 w-3.5" /> Detection</TabsTrigger>
            <TabsTrigger value="notifications" className="lg:w-full lg:justify-start"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="security" className="lg:w-full lg:justify-start"><ShieldCheck className="h-3.5 w-3.5" /> Security</TabsTrigger>
            <TabsTrigger value="api" className="lg:w-full lg:justify-start"><KeyRound className="h-3.5 w-3.5" /> API</TabsTrigger>
            <TabsTrigger value="privacy" className="lg:w-full lg:justify-start"><Lock className="h-3.5 w-3.5" /> Privacy</TabsTrigger>
          </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Profile</CardTitle>
              <CardDescription className="text-xs">Your display information across the workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(saveProfile)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full name</Label>
                    <Input id="full-name" {...form.register("fullName")} aria-invalid={!!form.formState.errors.fullName} />
                    {form.formState.errors.fullName && (
                      <p className="text-xs text-manipulated" role="alert">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...form.register("email")} aria-invalid={!!form.formState.errors.email} />
                    {form.formState.errors.email && (
                      <p className="text-xs text-manipulated" role="alert">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="org">Organization</Label>
                    <Input id="org" {...form.register("organization")} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="h-4 w-4" /> Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detection">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Default detection signals</CardTitle>
              <CardDescription className="text-xs">Signals enabled by default on new analyses.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {signals.map((s) => (
                  <label key={s.id} className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3 hover:bg-accent/40">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{s.label}</p>
                      <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                    </div>
                    <Switch checked={s.on} onCheckedChange={() => toggleSignal(s.id)} aria-label={`Toggle ${s.label}`} />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
              <CardDescription className="text-xs">Choose what reaches your inbox and the activity stream.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(notifications).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3 hover:bg-accent/40">
                  <span className="text-[13px] capitalize text-foreground">
                    {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </span>
                  <Switch checked={value} onCheckedChange={() => toggleNotification(key as keyof typeof notifications)} aria-label={`Toggle ${key}`} />
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Security</CardTitle>
              <CardDescription className="text-xs">Multi-factor authentication and active sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Two-factor authentication</p>
                  <p className="text-[11px] text-muted-foreground">Require a TOTP code at sign-in.</p>
                </div>
                <Switch defaultChecked aria-label="Enable two-factor authentication" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Active sessions</p>
                  <p className="text-[11px] text-muted-foreground">macOS · Chrome · San Francisco, CA</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.info("All other sessions signed out")}>
                  Sign out others
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-foreground">C2PA signing key</p>
                  <p className="hex-mono text-[11px] text-muted-foreground">ed25519:••••••••9f3c · rotated 14 days ago</p>
                </div>
                <Badge variant="authentic" className="normal-case">Healthy</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">API access</CardTitle>
              <CardDescription className="text-xs">Default key used by integrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border border-border px-3 py-3">
                <code className="hex-mono flex-1 truncate text-[12px] text-muted-foreground">
                  {maskKey("authentiq-live-key-placeholder-001")}
                </code>
                <Badge variant="authentic" className="normal-case">Active</Badge>
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                Manage additional keys and quota from the <a href="/api" className="text-info hover:underline">API dashboard</a>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Privacy & data retention</CardTitle>
              <CardDescription className="text-xs">How your uploaded media is handled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-[12px] leading-6 text-muted-foreground">
                Uploaded media is encrypted in transit (TLS 1.3) and at rest (AES-256). Files are retained
                for the duration required to complete the assessment, then purged unless you choose to keep
                them for evidence. AUTHENTIQ does not train models on customer media without explicit consent.
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Store media as evidence</p>
                  <p className="text-[11px] text-muted-foreground">Keep source files linked to their analysis.</p>
                </div>
                <Switch defaultChecked aria-label="Store media as evidence" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Anonymous usage metrics</p>
                  <p className="text-[11px] text-muted-foreground">Aggregate telemetry for reliability only.</p>
                </div>
                <Switch defaultChecked aria-label="Anonymous usage metrics" />
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-authentic" />
                Compliant with SOC 2 Type II and GDPR data processing standards.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
