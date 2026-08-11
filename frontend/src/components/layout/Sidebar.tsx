"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  History,
  Layers,
  FolderSearch,
  FileText,
  KeyRound,
  Settings,
  LifeBuoy,
  ShieldCheck,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/analyze", label: "New Analysis", icon: FilePlus2 },
      { href: "/history", label: "Analysis History", icon: History },
      { href: "/batch", label: "Batch Analysis", icon: Layers },
      { href: "/evidence", label: "Evidence Library", icon: FolderSearch },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/api", label: "API", icon: KeyRound, badge: "v2" },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

export function SidebarContent({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const toggleCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);

  const close = () => {
    setMobileNavOpen(false);
    onNavigate?.();
  };

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={100}>
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        <div
          className={cn(
            "flex items-center justify-between pb-5 pt-6",
            collapsed ? "flex-col gap-3 px-3" : "px-5"
          )}
        >
          <Link
            href="/"
            onClick={close}
            className={cn("group flex items-center gap-3", collapsed && "flex-col gap-2")}
            aria-label="AUTHENTIQ overview"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-active shadow-sm">
              <ShieldCheck className="h-5 w-5 text-[#7fb4ff]" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-[0.18em] text-white">AUTHENTIQ</p>
                <p className="hex-mono text-[9px] font-medium uppercase tracking-[0.24em] text-sidebar-muted">
                  Digital Forensics
                </p>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-muted hover:bg-sidebar-accent hover:text-white lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav
          className={cn(
            "flex-1 overflow-y-auto pb-6 dark-sidebar-scroll",
            collapsed ? "space-y-6 px-3" : "space-y-6 px-3"
          )}
          aria-label="Primary"
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted/70">
                  {section.label}
                </p>
              )}
              <ul className={cn("space-y-0.5", collapsed && "space-y-1")}>
                {section.items.map((item) => {
                  const active =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const link = (
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#3b82f6]",
                        collapsed ? "justify-center px-0 py-2" : "px-2.5 py-2",
                        active
                          ? "bg-sidebar-active text-white"
                          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-[#7fb4ff] transition-opacity",
                          active ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      <Icon className={cn("shrink-0", collapsed ? "h-4.5 w-4.5 h-[18px] w-[18px]" : "h-4 w-4")} />
                      {!collapsed && item.label}
                      {!collapsed && "badge" in item && item.badge && (
                        <Badge className="ml-auto border-sidebar-border bg-sidebar-active px-1.5 py-0 text-[9px] text-sidebar-muted normal-case">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right" className="bg-[#1c2a42] text-white">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-4">
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-authentic opacity-40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-authentic" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1c2a42] text-white">
                  All systems operational
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-3 py-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-authentic opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-authentic" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white">System Status</p>
                <p className="text-[11px] text-sidebar-muted">All systems operational</p>
              </div>
            </div>
          )}

          <div className={cn("mt-3 space-y-0.5", collapsed && "mt-3")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  onClick={close}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md text-[13px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    collapsed ? "justify-center px-0 py-2" : "px-2.5 py-2"
                  )}
                >
                  <LifeBuoy className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")} />
                  {!collapsed && "Help"}
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="bg-[#1c2a42] text-white">
                  Help
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          <div className={cn("mt-2 border-t border-sidebar-border pt-2", collapsed && "flex justify-center")}>
            <button
              onClick={toggleCollapsed}
              className={cn(
                "flex items-center gap-2.5 rounded-md text-[12px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed ? "px-2 py-2" : "w-full px-2.5 py-2"
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronsLeft className="h-4 w-4" />
                  Collapse
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
