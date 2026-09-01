import React from "react";
import { NUM } from "../../constants/theme";

export const Sel = ({ T, value, onChange, opts = [], className = "" }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`text-xs px-1.5 py-1.5 outline-none w-full ${className}`}
    style={{ ...NUM, border: `1px solid ${T.line}`, background: T.input, color: T.text }}
  >
    {opts.map((o) => (
      <option key={o.id} value={o.id}>
        {o.nome}
      </option>
    ))}
  </select>
);
