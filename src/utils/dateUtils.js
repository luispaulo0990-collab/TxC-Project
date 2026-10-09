/* ─── Manipulação e Formatação de Datas ─────────────────────── */

export const D = (s) => {
  if (!s) return new Date();
  if (s instanceof Date) return s;
  return new Date(s + "T00:00:00");
};

export const iso = (d) => {
  if (!d) return "";
  const dateObj = typeof d === "string" ? D(d) : d;
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
};

export const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const diffDays = (a, b) => {
  return Math.round((b - a) / 86400000);
};

export const fmtBR = (d) => {
  if (!d) return "";
  const dateObj = typeof d === "string" ? D(d) : d;
  return `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}/${dateObj.getFullYear()}`;
};

export const uid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const hoje = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const MESES_PT = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

export function parseData(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) {
    // Adiciona 12h para neutralizar fusos horários (evita que 00:00 UTC caia no dia anterior em UTC-3)
    const shifted = new Date(v.getTime() + 12 * 3600 * 1000);
    return new Date(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  }
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d) ? null : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const s = String(v).trim().toLowerCase();
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const ano = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const d = new Date(ano, +m[2] - 1, +m[1]);
    return isNaN(d) ? null : d;
  }
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[\/\-.\s]+([a-z]{3})[a-z]*[\/\-.\s]+(\d{2,4})$/);
  if (m && MESES_PT[m[2]] !== undefined) {
    const ano = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(ano, MESES_PT[m[2]], +m[1]);
  }
  const d = new Date(s);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export * from "./calendarUtils.js";
