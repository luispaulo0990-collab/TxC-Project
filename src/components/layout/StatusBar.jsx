import React from "react";
import { Check, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { OK, ERRO, ORANGE, NUM } from "../../constants/theme";

export const StatusBar = ({
  T,
  alertas = [],
  status,
  onSelectConflito,
  exibirCruzamentos = true,
  setExibirCruzamentos,
}) => {
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
          {setExibirCruzamentos && (
            <button
              type="button"
              onClick={() => setExibirCruzamentos(!exibirCruzamentos)}
              className="text-[10.5px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
              style={{
                background: exibirCruzamentos ? "rgba(214, 69, 69, 0.12)" : T.raised,
                color: exibirCruzamentos ? ERRO : T.muted,
                border: `1px solid ${exibirCruzamentos ? "rgba(214, 69, 69, 0.35)" : T.line}`,
              }}
              title={exibirCruzamentos ? "Clique para ocultar os apontamentos no gráfico" : "Clique para exibir os apontamentos no gráfico"}
            >
              {exibirCruzamentos ? <EyeOff size={11} /> : <Eye size={11} />}
              <span>{exibirCruzamentos ? "Ocultar no gráfico" : "Exibir no gráfico"}</span>
            </button>
          )}
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
