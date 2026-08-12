export const EASE = {
  out: [0.22, 1, 0.36, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const,
  snappy: [0.16, 1, 0.3, 1] as const,
};

export const DURATION = {
  fast: 0.35,
  base: 0.6,
  slow: 0.9,
  lab: 1.4,
};

export const VIEWPORT = { once: true, amount: 0.35 } as const;