"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/animations/scroll";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1.6,
  delay = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = usePrefersReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(
    mv,
    (v) => `${prefix}${v.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, now - t0) / (duration * 1000));
      mv.set(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, inView, value, duration, delay, mv]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}