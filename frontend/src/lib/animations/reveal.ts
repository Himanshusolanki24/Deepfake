"use client";

import type { Variants } from "motion/react";
import { EASE, VIEWPORT } from "./constants";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE.out },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: EASE.out } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: EASE.out },
  },
};

export const blurToSharp: Variants = {
  hidden: { opacity: 0, filter: "blur(10px)", y: 8 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: 0.9, ease: EASE.out },
  },
};

export const clipUp: Variants = {
  hidden: { clipPath: "inset(0 0 100% 0)", y: 28 },
  visible: {
    clipPath: "inset(0 0 0% 0)",
    y: 0,
    transition: { duration: 0.8, ease: EASE.out },
  },
};

export const staggerCoeval = (index: number, gap = 0.09): number => index * gap;

export const VIEWPORT_ONCE = VIEWPORT;