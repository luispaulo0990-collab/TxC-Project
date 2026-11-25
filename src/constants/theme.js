/* ═══════════════════════════════════════════════════════════════
   TEMPO × CAMINHO
   Identidade Unità · Padrão visual v2.0 ("soft clean", nov/2026)
   Marca: Laranja #FE5000 · Grafite #231F20 · neutros quentes (escala ink)
   Tipografia: Inter (texto) · Sora (títulos)
   ═══════════════════════════════════════════════════════════════ */

/* Marca */
export const ORANGE = "#FE5000";        // --color-primary
export const ORANGE_HOVER = "#E04700";  // --color-primary-hover
export const ORANGE_SOFT = "#FFF1EA";   // --color-primary-soft
export const INK = "#231F20";           // --color-secondary (grafite da marca: barras e cabeçalhos)
export const BLACK = "#000000";         // preto puro (cor de atividade / dados)
export const P447 = "#373A36";          // legado (paleta de atividades)
export const COOL2 = "#D0D0CE";         // legado

/* Neutros quentes (escala ink) */
export const INK_SCALE = {
  50: "#F8F7F6", 100: "#F0EEEC", 200: "#E2DFDC", 300: "#C9C4C0", 400: "#A19B96",
  500: "#77716D", 600: "#57524F", 700: "#3D3937", 800: "#2B2827", 900: "#1A1817",
};

/* Status: cor forte + fundo suave */
export const ERRO = "#C62828";          // realizado / conflito (--error)
export const OK = "#1E8A4C";            // --success
export const STATUS = {
  success: "#1E8A4C", successSoft: "#E7F5EC",
  warning: "#B7791F", warningSoft: "#FDF4E3",
  error: "#C62828", errorSoft: "#FDECEC",
  info: "#2563A8", infoSoft: "#E8F0FA",
};

/* Raio e sombras v2 */
export const RADIUS = { control: 10, card: 16 };
export const SHADOW = {
  card: "0 1px 2px rgb(26 24 23 / 0.04), 0 4px 18px rgb(26 24 23 / 0.05)",
  hover: "0 2px 4px rgb(26 24 23 / 0.05), 0 10px 28px rgb(26 24 23 / 0.08)",
  overlay: "0 10px 30px rgb(26 24 23 / 0.18)",
};
export const OVERLAY = "rgb(26 24 23 / 0.45)";
export const FOCUS_RING = "rgb(254 80 0 / 0.2)";

const K = INK_SCALE;

export const THEME = {
  claro: {
    bg: K[50],
    chrome: INK,
    panel: "#FFFFFF",
    raised: K[50],
    hover: K[100],
    line: K[200],
    lineSoft: K[100],
    text: K[900],
    muted: K[500],
    dim: K[400],
    surface: "#FFFFFF",
    band: K[50],
    grid: K[100],
    gridMes: K[300],
    row: K[100],
    label: K[900],
    labelAlt: K[500],
    labelBg: "#FFFFFF",
    labelBgAlt: K[50],
    strip: INK,
    stripText: "#FFFFFF",
    input: "#FFFFFF",
    primarySoft: ORANGE_SOFT,
    shadow: SHADOW.card,
    shadowHover: SHADOW.hover,
    scheme: "light",
    logoInk: BLACK,
  },
  escuro: {
    bg: "#141211",
    chrome: "#0F0D0C",
    panel: K[900],
    raised: "#211E1D",
    hover: K[800],
    line: "#35312F",
    lineSoft: "#2A2725",
    text: K[100],
    muted: K[400],
    dim: K[500],
    surface: "#171514",
    band: "#1D1A19",
    grid: "#2A2725",
    gridMes: "#46413E",
    row: "#221F1E",
    label: K[100],
    labelAlt: K[400],
    labelBg: "#1A1817",
    labelBgAlt: "#1F1C1B",
    strip: "#0F0D0C",
    stripText: "#FFFFFF",
    input: "#211E1D",
    primarySoft: "rgb(254 80 0 / 0.14)",
    shadow: "0 1px 2px rgb(0 0 0 / 0.3), 0 4px 18px rgb(0 0 0 / 0.25)",
    shadowHover: "0 2px 4px rgb(0 0 0 / 0.35), 0 10px 28px rgb(0 0 0 / 0.35)",
    scheme: "dark",
    logoInk: "#FFFFFF",
  },
};

export const FONT = "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
export const FONT_DISPLAY = "'Sora', 'Inter', ui-sans-serif, system-ui, sans-serif";
export const NUM = { fontFamily: FONT, fontVariantNumeric: "tabular-nums", fontFeatureSettings: "'tnum'" };

export const PALETTE = [
  BLACK, "#1F4E79", "#2E86AB", "#4CA1A3", "#2E9E63", "#7FB069",
  "#C9A227", ORANGE, "#D64545", "#B5446E", "#7D5BA6", P447,
];

export const LABEL_W = 210;
export const TOWER_STRIP = 26;
export const HEADER_H = 46;
export const MESES_ABR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const DIAS_MES = 20; // Padrão: 4 semanas de 5 dias úteis = 20 dias úteis/mês
