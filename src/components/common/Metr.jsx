import React from "react";
import { NUM, ORANGE } from "../../constants/theme";

export const Metr = ({ T, k, v, destaque = false }) => (
  <div className="flex items-baseline justify-between py-0.5 gap-2">
    <span style={{ fontSize: 10.5, color: T.muted }}>{k}</span>
    <span
      style={{
        ...NUM,
        fontSize: destaque ? 14 : 11,
        fontWeight: destaque ? 700 : 400,
        color: destaque ? ORANGE : T.text,
        whiteSpace: "nowrap",
      }}
    >
      {v}
    </span>
  </div>
);
