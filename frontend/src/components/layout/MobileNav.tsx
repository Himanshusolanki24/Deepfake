"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  FilePlus2,
  History,
  Layers,
  FolderSearch,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";

const ITEMS = [
  { href: "/workspace", label: "Overview", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze", icon: FilePlus2 },
  { href: "/history", label: "History", icon: History },
  { href: "/batch", label: "Batch", icon: Layers },
  { href: "/evidence", label: "Evidence", icon: FolderSearch },
  { href: "/api", label: "API", icon: KeyRound },
];

export function MobileNav() {
  const pathname = usePathname();
  const open = useUiStore((s) => s.mobileNavOpen);

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-14 items-stretch justify-around border-t border-border bg-card lg:hidden",
          open && "hidden"
        )}
        aria-label="Mobile"
      >
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-info" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-info"
                />
              )}
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
