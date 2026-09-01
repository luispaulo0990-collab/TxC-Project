import React from "react";
import {
  X,
  PanelRightOpen,
  TrendingUp,
  AlertTriangle,
  Copy,
  Trash2,
} from "lucide-react";
import { Campo } from "../common/Campo";
import { Sel } from "../common/Sel";
import { Metr } from "../common/Metr";
import { PALETTE, ORANGE, ERRO, NUM } from "../../constants/theme";
import { D, fmtBR } from "../../utils/dateUtils";

export const PropertiesPanel = ({
  T,
  showProps,
  setShowProps,
  sel,
  proj,
  upA,
  metrica,
  alertas = [],
  ajustarVelocidade,
  ajustarDias,
  onDuplicar,
  onExcluir,
}) => {
  if (!showProps) {
    return (
      <button
        onClick={() => setShowProps(true)}
        title="Abrir painel de propriedades"
        className="w-9 shrink-0 flex items-start justify-center pt-4 transition-colors hover:bg-black/5"
        style={{ background: T.panel, borderLeft: `1px solid ${T.line}`, color: T.muted }}
      >
        <PanelRightOpen size={16} />
      </button>
    );
  }

  return (
    <aside className="w-72 shrink-0 overflow-y-auto relative shadow-sm" style={{ background: T.panel, borderLeft: `1px solid ${T.line}` }}>
      <button
        onClick={() => setShowProps(false)}
        title="Fechar painel"
        className="absolute top-3 right-3 p-1 hover:opacity-75"
        style={{ color: T.dim, zIndex: 5, lineHeight: 0 }}
      >
        <X size={15} />
      </button>

      {!sel ? (
        <div className="p-5 pt-12">
          <div className="text-xs leading-relaxed" style={{ color: T.muted }}>
            Selecione uma atividade no gráfico ou na lista para editar suas propriedades.
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: T.dim, fontWeight: 700, marginBottom: 10 }}>
              ATALHOS DE ARRASTE NO GRÁFICO
            </div>
            {[
              ["arrastar corpo", "move no tempo"],
              ["ponta laranja (topo)", "muda a velocidade"],
              ["ponta inicial", "muda início / escopo"],
            ].map(([a, b]) => (
              <div key={a} className="flex justify-between items-baseline py-1" style={{ fontSize: 10.5 }}>
                <span style={{ color: T.text }}>{a}</span>
                <span style={{ color: T.dim }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (() => {
        const m = metrica(sel);
        const locais = proj.locais
          .filter((l) => l.torreId === sel.torreId)
          .sort((a, b) => a.ordem - b.ordem);
        const alertasSel = alertas.filter((x) => x.aId === sel.id || x.bId === sel.id);

        return (
          <div className="p-4">
            <div className="flex items-start gap-2 mb-4 pr-6">
              <div className="w-1 self-stretch rounded-xs" style={{ background: sel.cor }} />
              <input
                value={sel.nome}
                onChange={(e) => upA(sel.id, { nome: e.target.value })}
                className="flex-1 text-sm bg-transparent outline-none py-0.5 font-bold"
                style={{ color: T.text }}
              />
            </div>

            <Campo T={T} label="Cor">
              <div className="grid grid-cols-6 gap-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => upA(sel.id, { cor: c })}
                    className="rounded-xs transition-transform hover:scale-105"
                    style={{
                      background: c,
                      height: 20,
                      border: `1px solid ${T.line}`,
                      outline: sel.cor === c ? `2px solid ${ORANGE}` : "none",
                      outlineOffset: 1,
                    }}
                  />
                ))}
              </div>
            </Campo>

            <Campo T={T} label="Modo de desenho">
              <div className="flex rounded overflow-hidden">
                {["LINHA", "BLOCO"].map((mm) => (
                  <button
                    key={mm}
                    onClick={() => upA(sel.id, { modo: mm })}
                    className="flex-1 py-1.5 text-xs transition-colors"
                    style={{
                      background: sel.modo === mm ? ORANGE : T.raised,
                      color: sel.modo === mm ? "#fff" : T.muted,
                      border: `1px solid ${sel.modo === mm ? ORANGE : T.line}`,
                      fontWeight: sel.modo === mm ? 700 : 400,
                    }}
                  >
                    {mm.toLowerCase()}
                  </button>
                ))}
              </div>
            </Campo>

            <Campo T={T} label="Escopo de pavimentos">
              <div className="grid grid-cols-2 gap-1.5">
                <Sel T={T} value={sel.locIniId} onChange={(v) => upA(sel.id, { locIniId: v })} opts={locais} />
                <Sel T={T} value={sel.locFimId} onChange={(v) => upA(sel.id, { locFimId: v })} opts={locais} />
              </div>
            </Campo>

            <Campo T={T} label="Datas planejadas">
              <div className="grid grid-cols-2 gap-1.5">
                {["dataIni", "dataFim"].map((k) => (
                  <input
                    key={k}
                    type="date"
                    value={sel[k]}
                    onChange={(e) => upA(sel.id, { [k]: e.target.value })}
                    className="text-xs px-1.5 py-1.5 outline-none rounded-xs"
                    style={{
                      ...NUM,
                      border: `1px solid ${T.line}`,
                      background: T.input,
                      color: T.text,
                      colorScheme: T.scheme,
                    }}
                  />
                ))}
              </div>
            </Campo>

            {sel.modo === "LINHA" && (
              <div className="mt-3 p-3 rounded-sm" style={{ background: T.raised, border: `1px solid ${T.line}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: T.dim, fontWeight: 700 }}>
                    INCLINAÇÃO & VELOCIDADE
                  </div>
                  <span className="text-xs font-bold" style={{ ...NUM, color: ORANGE }}>
                    {m.ritmoMes.toFixed(2)} pav/mês
                  </span>
                </div>

                {/* Steppers rápidos de velocidade */}
                <div className="flex gap-1 mb-2">
                  {[
                    { label: "-0.5", val: -0.5 },
                    { label: "-0.1", val: -0.1 },
                    { label: "+0.1", val: +0.1 },
                    { label: "+0.5", val: +0.5 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => ajustarVelocidade(sel.id, Math.max(0.1, m.ritmoMes + btn.val))}
                      className="flex-1 py-1 text-xs font-semibold rounded-xs transition-colors hover:brightness-95"
                      style={{
                        ...NUM,
                        background: T.panel,
                        border: `1px solid ${T.line}`,
                        color: T.text,
                      }}
                      title={`Ajustar velocidade em ${btn.label} pav/mês`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Presets rápidos */}
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {[1.0, 2.0, 3.0, 4.0].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => ajustarVelocidade(sel.id, v)}
                      className="py-1 text-xs font-semibold rounded-xs transition-colors hover:brightness-95"
                      style={{
                        ...NUM,
                        background: Math.abs(m.ritmoMes - v) < 0.05 ? ORANGE : T.panel,
                        color: Math.abs(m.ritmoMes - v) < 0.05 ? "#fff" : T.text,
                        border: `1px solid ${Math.abs(m.ritmoMes - v) < 0.05 ? ORANGE : T.line}`,
                      }}
                    >
                      {v.toFixed(1)}/mês
                    </button>
                  ))}
                </div>

                <div className="text-xs" style={{ color: T.dim, fontSize: 10, lineHeight: 1.4 }}>
                  💡 <strong>No gráfico:</strong> arraste a ponta do topo da linha para acelerar (esquerda) ou desacelerar (direita).
                </div>
              </div>
            )}

            <div className="mt-3 p-3 rounded-sm" style={{ background: T.raised, border: `1px solid ${T.line}` }}>
              <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: T.dim, fontWeight: 700, marginBottom: 8 }}>
                MÉTRICAS CALCULADAS
              </div>
              <Metr T={T} k="Velocidade" v={sel.modo === "BLOCO" ? "—" : `${m.ritmoMes.toFixed(2)} pav/mês`} destaque />
              <Metr T={T} k="Dias por pavimento" v={sel.modo === "BLOCO" ? "—" : m.diasPorPav.toFixed(1)} />
              <Metr T={T} k="Pavimentos no escopo" v={m.nLoc} />
              <Metr T={T} k="Duração" v={`${m.meses.toFixed(1)} mês · ${m.dias} dias`} />
            </div>

            {sel.realIni && (
              <div className="mt-3 p-3 rounded-sm" style={{ background: "rgba(214,69,69,0.07)", border: `1px solid rgba(214,69,69,0.3)` }}>
                <div className="text-xs flex items-center gap-1.5 mb-1 font-bold" style={{ color: ERRO }}>
                  <TrendingUp size={12} /> Realizado
                </div>
                <div style={{ ...NUM, fontSize: 10.5, color: T.text }}>
                  {fmtBR(D(sel.realIni))} → {fmtBR(D(sel.realFim))}
                </div>
                <button
                  onClick={() => upA(sel.id, { realIni: null, realFim: null })}
                  className="mt-1.5 text-xs hover:opacity-75"
                  style={{ color: T.muted, textDecoration: "underline" }}
                >
                  remover realizado
                </button>
              </div>
            )}

            {alertasSel.length > 0 && (
              <div className="mt-3 p-3 rounded-sm" style={{ background: "rgba(214,69,69,0.08)", border: `1px solid rgba(214,69,69,0.35)` }}>
                <div className="text-xs flex items-center gap-1.5 mb-2 font-bold" style={{ color: ERRO }}>
                  <AlertTriangle size={12} /> {alertasSel.length} cruzamento{alertasSel.length > 1 ? "s" : ""}
                </div>
                {alertasSel.map((al) => (
                  <div key={al.id} className="mb-1.5" style={{ fontSize: 10.5, color: T.text, lineHeight: 1.45 }}>
                    {al.texto}
                    <br />
                    <span style={{ ...NUM, color: T.muted }}>
                      {al.onde} · {al.quando}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-1.5 mt-4">
              <button
                onClick={() => onDuplicar(sel)}
                className="flex-1 py-2 text-xs flex items-center justify-center gap-1.5 rounded transition-colors hover:brightness-95"
                style={{ border: `1px solid ${T.line}`, color: T.text, background: T.raised }}
              >
                <Copy size={12} /> Duplicar
              </button>
              <button
                onClick={() => onExcluir(sel.id)}
                className="flex-1 py-2 text-xs flex items-center justify-center gap-1.5 rounded transition-colors hover:bg-red-50"
                style={{ border: `1px solid ${T.line}`, color: ERRO, background: T.raised }}
              >
                <Trash2 size={12} /> Excluir
              </button>
            </div>
          </div>
        );
      })()}
    </aside>
  );
};
