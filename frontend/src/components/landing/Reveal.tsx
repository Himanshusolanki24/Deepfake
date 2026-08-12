"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { fadeUp } from "@/lib/animations/reveal";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  variants?: Variants;
  y?: number;
}

export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.7,
  variants = fadeUp,
  y,
}: RevealProps) {
  const resolved: Variants = {
    hidden: y !== undefined ? { opacity: 0, y } : variants.hidden,
    visible: {
      ...(variants.visible as object),
      transition: { duration, delay },
    },
  };

  return (
    <motion.div
      className={className}
      variants={resolved}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {children}
    </motion.div>
  );
}