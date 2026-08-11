"use client";

import { SidebarContent } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { MobileSidebarDrawer } from "@/components/layout/MobileSidebarDrawer";
import { useUiStore } from "@/store/uiStore";

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 72;

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <div className="flex min-h-screen">
      <aside
        className="sticky top-0 z-30 hidden h-dvh shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-in-out lg:block"
        style={{ width }}
        aria-label="Sidebar"
      >
        <SidebarContent collapsed={collapsed} />
      </aside>
      <MobileSidebarDrawer />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 pb-16 lg:pb-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
