import React from "react";
import {
  Layers,
  Building2,
  Plus,
  FileSpreadsheet,
  AlertTriangle,
  Copy,
  ChevronRight,
  ChevronDown,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";
import { ORANGE, ERRO, NUM } from "../../constants/theme";

export const Sidebar = ({
  T,
  tab,
  setTab,
  proj,
  setProj,
  filtroTorre,
  selId,
  setSelId,
  setShowProps,
  metrica,
  alertas = [],
  collapsed,
  setCollapsed,
  upA,
  onNovaAtividade,
  onAbrirModal,
  onExcluirTorre,
  onAddTorreVazia,
}) => {
  return (
    <aside className="w-64 shrink-0 flex flex-col" style={{ background: T.panel, borderRight: `1px solid ${T.line}` }}>
      {/* Abas */}
      <div className="flex shrink-0" style={{ borderBottom: `1px solid ${T.line}` }}>
        {[
          ["atividades", "Atividades", Layers],
          ["estrutura", "Estrutura", Building2],
        ].map(([k, l, Ic]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5 transition-colors"
            style={{
              color: tab === k ? T.text : T.dim,
              background: tab === k ? T.panel : T.raised,
              borderBottom: tab === k ? `2px solid ${ORANGE}` : "2px solid transparent",
              fontWeight: 500,
            }}
          >
            <Ic size={13} />
            {l}
          </button>
        ))}
      </div>

      {tab === "atividades" ? (
        <>
          <div className="px-3 pt-3 pb-1 flex gap-1.5">
            <button
              onClick={onNovaAtividade}
              className="flex-1 py-2 text-xs flex items-center justify-center gap-1.5 font-bold transition-all hover:brightness-110"
              style={{ background: ORANGE, color: "#fff" }}
            >
              <Plus size={13} /> Nova atividade
            </button>
            <button
              onClick={() =>
                onAbrirModal({
                  tipo: "aplicarMacrofluxo",
                  torreId: filtroTorre !== "TODAS" ? filtroTorre : proj.torres[0]?.id,
                })
              }
              title="Gerar atividades via Macrofluxo"
              className="px-2 flex items-center justify-center transition-colors hover:brightness-95"
              style={{ border: `1px solid ${T.line}`, background: T.raised, color: ORANGE }}
            >
              <Zap size={14} />
            </button>
            <button
              onClick={() => onAbrirModal("importmenu")}
              title="Importar planilha"
              className="px-2 flex items-center justify-center transition-colors hover:brightness-95"
              style={{ border: `1px solid ${T.line}`, background: T.raised, color: T.muted }}
            >
              <FileSpreadsheet size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-1.5 py-2">
            {proj.torres.map((t) => {
              if (filtroTorre !== "TODAS" && filtroTorre !== t.id) return null;
              const as = proj.atividades.filter((a) => a.torreId === t.id);
              return (
                <div key={t.id} className="mb-2">
                  <div className="px-2 py-1 text-xs flex items-center justify-between" style={{ ...NUM, color: T.dim, letterSpacing: 0.5 }}>
                    <div className="flex items-center gap-1.5">
                      <span>{t.nome}</span>
                      <span>·</span>
                      <span>{as.length}</span>
                    </div>
                    {as.length === 0 && (
                      <button
                        onClick={() => onAbrirModal({ tipo: "aplicarMacrofluxo", torreId: t.id })}
                        className="text-[10px] font-bold hover:underline flex items-center gap-0.5"
                        style={{ color: ORANGE }}
                        title="Aplicar Macrofluxo nesta torre"
                      >
                        <Zap size={10} /> Gerar
                      </button>
                    )}
                  </div>
                  {as.map((a) => {
                    const m = metrica(a);
                    const alerta = alertas.some((x) => x.aId === a.id || x.bId === a.id);
                    const on = selId === a.id;
                    return (
                      <div
                        key={a.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", a.id);
                          e.dataTransfer.effectAllowed = "move";
                          setSelId(a.id);
                        }}
                        onClick={() => {
                          setSelId(a.id);
                          setShowProps(true);
                        }}
                        className="group/item flex items-center gap-2 px-2 py-1.5 cursor-grab active:cursor-grabbing rounded-sm transition-colors"
                        style={{
                          background: on ? T.hover : "transparent",
                          borderLeft: `2px solid ${on ? ORANGE : "transparent"}`,
                        }}
                        title="Clique para selecionar ou arraste para dentro do gráfico para agendar"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            upA(a.id, { visivel: a.visivel === false });
                          }}
                          className="shrink-0 rounded-xs"
                          style={{
                            width: 10,
                            height: 10,
                            background: a.visivel === false ? "transparent" : a.cor,
                            border: `1.5px solid ${a.cor}`,
                          }}
                          title={a.visivel === false ? "Mostrar no gráfico" : "Ocultar do gráfico"}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-xs truncate flex items-center gap-1 font-medium"
                            style={{ color: a.visivel === false ? T.dim : T.text }}
                          >
                            {a.nome}
                            {a.realIni && (
                              <span
                                style={{ width: 5, height: 5, borderRadius: 5, background: ERRO, display: "inline-block" }}
                                title="tem realizado importado"
                              />
                            )}
                          </div>
                          <div style={{ ...NUM, fontSize: 10, color: T.dim }}>
                            {a.modo === "BLOCO" ? `bloco · ${m.meses.toFixed(1)} mês` : `${m.ritmoMes.toFixed(1)} pav/mês`}
                          </div>
                        </div>
                        {alerta && <AlertTriangle size={12} style={{ color: ERRO, flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <button
            onClick={() => onAbrirModal("replicar")}
            className="w-full py-2 mb-2 text-xs flex items-center justify-center gap-1.5 font-bold transition-all hover:brightness-110"
            style={{ background: ORANGE, color: "#fff" }}
          >
            <Copy size={13} /> Replicar torre com defasagem
          </button>

          {proj.torres.map((t) => {
            const n = proj.locais.filter((l) => l.torreId === t.id).length;
            return (
              <div key={t.id} className="mb-2 p-2.5 rounded-sm" style={{ border: `1px solid ${T.line}`, background: T.raised }}>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCollapsed((c) => ({ ...c, [t.id]: !c[t.id] }))} style={{ color: T.muted }}>
                    {collapsed[t.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <input
                    value={t.nome}
                    onChange={(e) =>
                      setProj((p) => ({
                        ...p,
                        torres: p.torres.map((x) => (x.id === t.id ? { ...x, nome: e.target.value } : x)),
                      }))
                    }
                    className="flex-1 text-xs bg-transparent outline-none font-bold"
                    style={{ color: T.text }}
                  />
                  <button onClick={() => onExcluirTorre(t.id)} title="Excluir torre" className="p-1 hover:opacity-75">
                    <Trash2 size={12} style={{ color: T.dim }} />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between" style={{ ...NUM, fontSize: 10, color: T.dim }}>
                  <span>{n} pavimentos</span>
                  {t.origem && <span style={{ color: ORANGE, fontWeight: 700 }}>+{t.offsetDias}d</span>}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <button
                    onClick={() => onAbrirModal({ tipo: "gerar", torreId: t.id })}
                    className="py-1.5 text-[11px] flex items-center justify-center gap-1 transition-colors hover:brightness-95 rounded"
                    style={{ border: `1px solid ${T.line}`, background: T.panel, color: T.text }}
                  >
                    <Wand2 size={11} /> Pavimentos
                  </button>
                  <button
                    onClick={() => onAbrirModal({ tipo: "aplicarMacrofluxo", torreId: t.id })}
                    className="py-1.5 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors hover:brightness-95 rounded"
                    style={{ border: `1px solid ${T.line}`, background: T.panel, color: ORANGE }}
                  >
                    <Zap size={11} /> Macrofluxo
                  </button>
                </div>
              </div>
            );
          })}

          <button
            onClick={onAddTorreVazia}
            className="w-full py-2 text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-black/5"
            style={{ border: `1px dashed ${T.line}`, color: T.muted }}
          >
            <Plus size={13} /> Adicionar torre vazia
          </button>
        </div>
      )}
    </aside>
  );
};
