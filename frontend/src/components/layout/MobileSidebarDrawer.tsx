"use client";

import { motion } from "motion/react";
import { SidebarContent } from "./Sidebar";
import { useUiStore } from "@/store/uiStore";

export function MobileSidebarDrawer() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => setOpen(false)}
      />
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="absolute inset-y-0 left-0 w-[280px] shadow-2xl"
      >
        <SidebarContent />
      </motion.aside>
    </div>
  );
}
