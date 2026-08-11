import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileNavOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
    }),
    {
      name: "authentiq-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    }
  )
);

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: "analysis" | "system" | "security" | "api";
}

export const mockNotifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Analysis complete",
    body: "VID-2026-00182 finished — suspicious, 87% confidence.",
    time: "12 min ago",
    read: false,
    kind: "analysis",
  },
  {
    id: "n2",
    title: "API quota warning",
    body: "75% of monthly analysis quota consumed.",
    time: "1 hr ago",
    read: false,
    kind: "api",
  },
  {
    id: "n3",
    title: "Signing key rotated",
    body: "C2PA signing key rotated automatically.",
    time: "3 hr ago",
    read: true,
    kind: "security",
  },
  {
    id: "n4",
    title: "System update deployed",
    body: "Forensic engine v2.4.1 deployed to production.",
    time: "6 hr ago",
    read: true,
    kind: "system",
  },
];
