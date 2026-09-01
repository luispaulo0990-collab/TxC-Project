import React from "react";
import { ORANGE } from "../../constants/theme";

/* ─── Logo Unità (reconstrução vetorial do wordmark) ────────── */
export const LogoUnita = ({ ink = "#fff", height = 20 }) => {
  const w = height * (918 / 355) * 0.62;
  return (
    <svg width={w} height={height} viewBox="0 0 260 96" style={{ display: "block" }} aria-label="Unità">
      <g fill={ink}>
        {/* u */}
        <path d="M2 30 h16 v34 c0 8 5 13 13 13 s13-5 13-13 V30 h16 v64 H44 v-7 c-4 5-10 8-18 8 C13 95 2 84 2 68 Z" />
        {/* n */}
        <path d="M70 30 h16 v7 c4-5 10-8 18-8 13 0 24 11 24 27 v38 h-16 V60 c0-8-5-13-13-13 s-13 5-13 13 v34 H70 Z" />
        {/* i */}
        <rect x="136" y="30" width="16" height="64" />
        <rect x="136" y="8" width="16" height="15" />
        {/* t */}
        <path d="M160 30 h10 V13 h16 v17 h14 v14 h-14 v28 c0 4 2 6 6 6 h8 v14 h-12 c-12 0-18-6-18-18 V44 h-10 Z" />
        {/* a */}
        <path d="M210 47 c3-12 12-18 26-18 16 0 24 9 24 25 v40 h-15 v-7 c-4 5-10 8-17 8-12 0-21-8-21-19 0-12 9-18 24-20 l14-2 v-1 c0-6-4-9-10-9-5 0-9 2-10 7 Z M255 68 l-11 2 c-7 1-10 4-10 8 0 5 4 8 9 8 7 0 12-5 12-12 Z" />
        {/* acento à — laranja */}
        <path d="M236 0 l22 -0 l-4 16 l-22 0 Z" fill={ORANGE} transform="translate(6,2) rotate(-14 247 8)" />
      </g>
    </svg>
  );
};
