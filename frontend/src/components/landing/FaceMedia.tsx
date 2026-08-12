interface FaceMediaProps {
  className?: string;
}

export function FaceMedia({ className }: FaceMediaProps) {
  return (
    <svg viewBox="0 0 300 360" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="aq-face-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef1f6" />
          <stop offset="1" stopColor="#e2e7ee" />
        </linearGradient>
        <linearGradient id="aq-face-vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.85" stopColor="#94a3b8" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="300" height="360" fill="url(#aq-face-bg)" />
      <path d="M60 360 C 62 300 96 282 150 282 C 204 282 238 300 240 360 Z" fill="#b6c0cf" />
      <rect x="128" y="244" width="44" height="52" rx="6" fill="#cfd6e2" />
      <ellipse cx="150" cy="162" rx="76" ry="92" fill="#d3dae6" />
      <path
        d="M150 66 C 104 64 74 92 74 132 C 74 150 80 160 88 166 C 92 112 120 90 150 90 C 182 90 208 112 212 166 C 220 160 226 150 226 132 C 226 92 196 64 150 66 Z"
        fill="#9aa7bc"
      />
      <ellipse cx="118" cy="182" rx="11" ry="6.5" fill="#8593a9" />
      <ellipse cx="182" cy="182" rx="11" ry="6.5" fill="#8593a9" />
      <path d="M147 196 C 148 214 148 226 150 236 C 152 226 153 214 154 196 C 151 192 150 192 147 196 Z" fill="#bac5d4" />
      <path d="M132 268 C 140 274 160 274 168 268 C 160 280 142 280 132 268 Z" fill="#a9b4c5" />
      <rect width="300" height="360" fill="url(#aq-face-vignette)" />
    </svg>
  );
}