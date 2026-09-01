/* ═══════════════════════════════════════════════════════════════
   TEMPO × CAMINHO · UNITÀ ENGENHARIA
   Identidade: Pantone Orange 021 C · All Black · 447 C · Cool Gray 2 C
   Tipografia: Helvetica Now (fallback Helvetica Neue / Inter / Arial)
   ═══════════════════════════════════════════════════════════════ */

/* Paleta oficial da marca */
export const ORANGE = "#FE5000";   // Pantone Orange 021 C · RGB 254 80 0
export const BLACK = "#000000";    // All Black
export const P447 = "#373A36";     // Pantone 447 C · grafite esverdeado
export const COOL2 = "#D0D0CE";    // Pantone Cool Gray 2 C
export const ERRO = "#D64545";     // realizado / conflito
export const OK = "#2E9E63";

export const THEME = {
  claro: {
    bg: "#ECEDEB",
    chrome: BLACK,
    panel: "#FFFFFF",
    raised: "#F5F5F3",
    hover: "#ECEDEA",
    line: "#DEDEDB",
    text: BLACK,
    muted: "#6A6E69",
    dim: "#A6A8A3",
    surface: "#FFFFFF",
    band: "#F6F6F4",
    grid: "#E7E7E4",
    gridMes: "#C6C7C2",
    row: "#EDEDEA",
    label: BLACK,
    labelAlt: "#6A6E69",
    labelBg: "#FFFFFF",
    labelBgAlt: "#F6F6F4",
    strip: P447,
    stripText: "#FFFFFF",
    input: "#FFFFFF",
    scheme: "light",
    logoInk: BLACK,
  },
  escuro: {
    bg: "#111310",
    chrome: BLACK,
    panel: "#1A1C19",
    raised: "#22241F",
    hover: "#2A2C27",
    line: "#33352F",
    text: "#ECEDEB",
    muted: "#9DA098",
    dim: "#63665F",
    surface: "#15170F",
    band: "#1B1D16",
    grid: "#282A22",
    gridMes: "#3E4138",
    row: "#212319",
    label: "#ECEDEB",
    labelAlt: "#9DA098",
    labelBg: "#191B14",
    labelBgAlt: "#1F2119",
    strip: BLACK,
    stripText: "#FFFFFF",
    input: "#22241F",
    scheme: "dark",
    logoInk: "#FFFFFF",
  },
};

export const FONT = "'Helvetica Now Display', 'Helvetica Now Text', 'Helvetica Now', 'Helvetica Neue', 'Inter', Helvetica, Arial, sans-serif";
export const NUM = { fontFamily: FONT, fontVariantNumeric: "tabular-nums", fontFeatureSettings: "'tnum'" };

export const PALETTE = [
  BLACK, "#1F4E79", "#2E86AB", "#4CA1A3", "#2E9E63", "#7FB069",
  "#C9A227", ORANGE, "#D64545", "#B5446E", "#7D5BA6", P447,
];

export const LABEL_W = 210;
export const TOWER_STRIP = 26;
export const HEADER_H = 46;
export const MESES_ABR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const DIAS_MES = 30;
