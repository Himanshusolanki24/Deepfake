"use client";

import { useReducedMotion } from "motion/react";

export function usePrefersReducedMotion() {
  const reduced = useReducedMotion();
  return reduced ?? false;
}

export function prefersReducedMotionQuery() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isCoarsePointer() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}