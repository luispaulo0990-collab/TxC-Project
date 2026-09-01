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

export const uid = () => Math.random().toString(36).slice(2, 10);

export const hoje = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export function parseData(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d) ? null : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const ano = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const d = new Date(ano, +m[2] - 1, +m[1]);
    return isNaN(d) ? null : d;
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
