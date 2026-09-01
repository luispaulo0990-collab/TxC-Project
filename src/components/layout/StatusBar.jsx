import React from "react";
import { Check, AlertTriangle } from "lucide-react";
import { OK, ERRO, ORANGE, NUM } from "../../constants/theme";

export const StatusBar = ({ T, alertas = [], status, onSelectConflito }) => {
  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4 h-9 overflow-x-auto select-none"
      style={{ background: T.panel, borderTop: `1px solid ${T.line}` }}
    >
      {alertas.length === 0 ? (
        <span className="text-xs flex items-center gap-1.5" style={{ color: T.muted }}>
          <Check size={13} style={{ color: OK }} /> Nenhum cruzamento de linhas detectado
        </span>
      ) : (
        <>
          <span className="text-xs flex items-center gap-1.5 shrink-0 font-bold" style={{ color: ERRO }}>
            <AlertTriangle size={13} /> {alertas.length} conflito{alertas.length > 1 ? "s" : ""}
          </span>
          {alertas.slice(0, 4).map((al) => (
            <button
              key={al.id}
              onClick={() => onSelectConflito(al.aId)}
              className="text-xs whitespace-nowrap px-2 py-0.5 shrink-0 rounded-xs transition-colors hover:brightness-95"
              style={{ ...NUM, fontSize: 10.5, color: T.text, background: T.raised, border: `1px solid ${T.line}` }}
            >
              {al.texto} · {al.onde} · {al.quando}
            </button>
          ))}
        </>
      )}

      <span className="ml-auto text-xs shrink-0 flex items-center gap-3">
        <span className="flex items-center gap-1" style={{ color: T.dim, fontSize: 10.5 }}>
          <span style={{ width: 14, height: 0, borderTop: `2px dashed ${ERRO}`, display: "inline-block" }} /> realizado
        </span>
        {status && <span style={{ color: ORANGE, fontWeight: 500 }}>{status}</span>}
      </span>
    </div>
  );
};
