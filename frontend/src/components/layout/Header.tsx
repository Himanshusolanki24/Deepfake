"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Search,
  Bell,
  PanelLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Settings,
  ShieldCheck,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUiStore, mockNotifications } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const ROUTE_LABELS: Record<string, string> = {
  analyze: "New Analysis",
  history: "Analysis History",
  batch: "Batch Analysis",
  evidence: "Evidence Library",
  reports: "Reports",
  compare: "Compare Analyses",
  api: "API Dashboard",
  settings: "Settings",
  analysis: "Analysis",
};

function breadcrumbFromPath(pathname: string): { label: string; mono?: boolean }[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Overview" }];
  return segments.map((seg, i) => {
    const isLast = i === segments.length - 1;
    if (seg === "report") return { label: "Report" };
    if (/^(VID|IMG|AUD)-\d{4}-\d{5}$/.test(seg)) return { label: seg, mono: true };
    const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    if (!isLast && label === "Analysis") return { label: "Analysis" };
    return { label };
  });
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const toggleSidebarCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unread] = useState(() => mockNotifications.filter((n) => !n.read).length);

  const crumbs = breadcrumbFromPath(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden lg:inline-flex"
          onClick={toggleSidebarCollapsed}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
              <span
                className={cn(
                  "truncate capitalize",
                  crumb.mono && "hex-mono normal-case text-[12px] font-semibold",
                  i === crumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 w-56 justify-between gap-3 rounded-md text-muted-foreground sm:flex"
              aria-label="Search analyses"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Search cases…</span>
              </span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Search cases</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-9"
                placeholder="Case ID, filename…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    router.push(`/history?q=${encodeURIComponent(e.currentTarget.value)}`);
                    setSearchOpen(false);
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Search across case IDs and media filenames in your analysis history.
            </p>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label={`Notifications, ${unread} unread`}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-manipulated opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-manipulated" />
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {mockNotifications.map((n) => (
                <DropdownMenuItem key={n.id} className="cursor-default">
                  <div className="flex w-full flex-col gap-0.5 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-info" />}
                        {n.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{n.time}</span>
                    </div>
                    <span className="text-xs leading-5 text-muted-foreground">{n.body}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="hidden items-center gap-1.5 rounded-md border border-authentic/20 bg-authentic-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-authentic md:inline-flex">
          <CircleDot className="h-3 w-3" />
          Operational
        </span>

        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-md p-0.5 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar text-[10px] text-white">HM</AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">Himanshu Solanki</span>
                <span className="hex-mono text-xs text-muted-foreground">Forensic Analyst · PRO</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <User className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <Settings className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <ShieldCheck className="h-4 w-4" /> Security
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AnalysisCaseHeader({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="hex-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Case <span className="text-foreground">{id}</span>
      </span>
      <Badge variant={status === "complete" ? "authentic" : "info"}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        {status === "complete" ? "Analysis Complete" : "Analysis In Progress"}
      </Badge>
    </div>
  );
}

export function CaseIdLink({ id }: { id: string }) {
  return (
    <Link
      href={`/analysis/${id}`}
      className="hex-mono text-[13px] font-semibold text-info transition-colors hover:underline"
    >
      {id}
    </Link>
  );
}
