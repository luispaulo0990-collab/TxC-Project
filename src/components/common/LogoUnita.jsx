import React from "react";

/* ─── Logo Unità (arquivos oficiais · Padrão visual v2) ─────────
   ink claro (#fff) → logo negativo (barras grafite); escuro → logo principal. */
const isClaro = (ink = "") => /^#?(fff|ffffff)$/i.test(ink.trim()) || /white/i.test(ink);

export const LogoUnita = ({ ink = "#fff", height = 20 }) => (
  <img
    src={isClaro(ink) ? "/brand/logo-unita-white.png" : "/brand/logo-unita.png"}
    alt="Unità"
    draggable={false}
    style={{ height, width: "auto", display: "block", userSelect: "none" }}
  />
);

/* Símbolo "un" (estados vazios, avatar) */
export const SimboloUn = ({ height = 40, mono = false, style }) => (
  <img
    src={mono ? "/brand/symbol-un-black.png" : "/brand/symbol-un-orange.png"}
    alt=""
    aria-hidden="true"
    draggable={false}
    style={{ height, width: "auto", display: "block", ...style }}
  />
);
