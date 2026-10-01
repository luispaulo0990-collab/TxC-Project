// src/components/layout/Sidebar.jsx
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
  ChevronLeft,
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
  showActivities = true,
  setShowActivities,
  upA,
  onNovaAtividade,
  onAbrirModal,
  onExcluirTorre,
  onAddTorreVazia,
}) => {
  // ── Se a coluna estiver oculta, exibe a barra fina colapsada ──
  if (!showActivities) {
    return (
      <div
        className="w-10 shrink-0 flex flex-col items-center py-3 border-r transition-all duration-200 select-none"
        style={{ background: T.panel, borderColor: T.line }}
      >
        <button
          onClick={() => setShowActivities && setShowActivities(true)}
          title="Exibir coluna de atividades"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:brightness-95 cursor-pointer shadow-xs"
          style={{
            border: `1px solid ${T.line}`,
            background: T.raised,
            color: ORANGE,
          }}
        >
          <ChevronRight size={15} />
        </button>

        {/* Rótulo vertical suave */}
        <div
          className="mt-6 flex items-center gap-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
          onClick={() => setShowActivities && setShowActivities(true)}
          title="Clique para expandir a coluna de atividades"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 10.5,
            letterSpacing: 1.5,
            color: T.dim,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          <Layers size={13} style={{ transform: "rotate(90deg)", color: ORANGE }} />
          <span>Atividades ({proj?.atividades?.length || 0})</span>
        </div>
      </div>
    );
  }

  // ── Coluna de Atividades Expandida ──
  return (
    <aside
      className="w-64 shrink-0 flex flex-col select-none transition-all duration-200"
      style={{ background: T.panel, borderRight: `1px solid ${T.line}` }}
    >
      {/* Cabeçalho de Abas com Botão de Ocultar */}
      <div className="flex items-center shrink-0" style={{ borderBottom: `1px solid ${T.line}` }}>
        {[
          ["atividades", "Atividades", Layers],
          ["estrutura", "Estrutura", Building2],
        ].map(([k, l, Ic]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            style={{
              color: tab === k ? T.text : T.dim,
              background: tab === k ? T.panel : T.raised,
              borderBottom: tab === k ? `2px solid ${ORANGE}` : "2px solid transparent",
              fontWeight: tab === k ? 700 : 500,
            }}
          >
            <Ic size={13} style={{ color: tab === k ? ORANGE : T.dim }} />
            {l}
          </button>
        ))}

        {setShowActivities && (
          <button
            onClick={() => setShowActivities(false)}
            title="Ocultar coluna de atividades"
            className="px-2.5 py-2.5 flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer border-l"
            style={{ borderColor: T.line, color: T.dim }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {tab === "atividades" ? (
        <>
          {/* Barra de Ações Rápidas no topo da lista */}
          <div className="px-3 pt-3 pb-1 flex gap-1.5">
            <button
              onClick={onNovaAtividade}
              className="flex-1 py-2 text-xs flex items-center justify-center gap-1.5 font-bold rounded-lg transition-all hover:brightness-110 shadow-xs cursor-pointer"
              style={{ background: ORANGE, color: "#fff" }}
            >
              <Plus size={13} /> Nova atividade
            </button>
            <button
              onClick={() =>
                onAbrirModal({
                  tipo: "aplicarMacrofluxo",
                  torreId: filtroTorre !== "TODAS" ? filtroTorre : proj?.torres?.[0]?.id,
                })
              }
              title="Gerar atividades via Macrofluxo"
              className="px-2.5 rounded-lg flex items-center justify-center transition-colors hover:brightness-95 cursor-pointer"
              style={{ border: `1px solid ${T.line}`, background: T.raised, color: ORANGE }}
            >
              <Zap size={14} />
            </button>
            <button
              onClick={() => onAbrirModal("importmenu")}
              title="Importar planilha de atividades ou avanços"
              className="px-2.5 rounded-lg flex items-center justify-center transition-colors hover:brightness-95 cursor-pointer"
              style={{ border: `1px solid ${T.line}`, background: T.raised, color: T.muted }}
            >
              <FileSpreadsheet size={14} />
            </button>
          </div>

          {/* Lista de Atividades por Torre */}
          <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
            {proj?.torres?.map((t) => {
              if (filtroTorre !== "TODAS" && filtroTorre !== t.id) return null;
              const as = proj.atividades ? proj.atividades.filter((a) => a.torreId === t.id) : [];
              return (
                <div key={t.id} className="mb-2.5">
                  <div
                    className="px-2 py-1 text-xs flex items-center justify-between"
                    style={{ ...NUM, color: T.dim, letterSpacing: 0.5 }}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span>{t.nome}</span>
                      <span>·</span>
                      <span className="text-[11px] opacity-80">{as.length}</span>
                    </div>
                    {as.length === 0 && (
                      <button
                        onClick={() => onAbrirModal({ tipo: "aplicarMacrofluxo", torreId: t.id })}
                        className="text-[10px] font-bold hover:underline flex items-center gap-0.5 text-orange-600 cursor-pointer"
                      >
                        <Zap size={11} /> Usar macrofluxo
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
                        className="group/item flex items-center gap-2 px-2.5 py-1.5 cursor-grab active:cursor-grabbing rounded-lg transition-all mb-0.5"
                        style={{
                          background: on ? T.hover : "transparent",
                          borderLeft: `2.5px solid ${on ? ORANGE : "transparent"}`,
                        }}
                        title="Clique para selecionar ou arraste para dentro do gráfico para agendar"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            upA(a.id, { visivel: a.visivel === false });
                          }}
                          className="shrink-0 rounded-xs transition-transform hover:scale-110 cursor-pointer"
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
                                title="Possui avanço real registrado"
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
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <button
            onClick={() => onAbrirModal("replicar")}
            className="w-full py-2 mb-2 text-xs flex items-center justify-center gap-1.5 font-bold rounded-lg transition-all hover:brightness-110 cursor-pointer shadow-xs"
            style={{ background: ORANGE, color: "#fff" }}
          >
            <Copy size={13} /> Replicar torre com defasagem
          </button>

          {proj?.torres?.map((t) => {
            const n = proj.locais ? proj.locais.filter((l) => l.torreId === t.id).length : 0;
            return (
              <div
                key={t.id}
                className="mb-2 p-2.5 rounded-xl transition-all"
                style={{ border: `1px solid ${T.line}`, background: T.raised }}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCollapsed && setCollapsed((c) => ({ ...c, [t.id]: !c[t.id] }))}
                    style={{ color: T.muted }}
                    className="cursor-pointer"
                  >
                    {collapsed?.[t.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
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
                  <button
                    onClick={() => onExcluirTorre(t.id)}
                    title="Excluir torre"
                    className="p-1 hover:opacity-75 cursor-pointer"
                  >
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
                    className="py-1.5 text-[11px] flex items-center justify-center gap-1 transition-colors hover:brightness-95 rounded-lg cursor-pointer"
                    style={{ border: `1px solid ${T.line}`, background: T.panel, color: T.text }}
                  >
                    <Wand2 size={11} /> Pavimentos
                  </button>
                  <button
                    onClick={() => onAbrirModal({ tipo: "aplicarMacrofluxo", torreId: t.id })}
                    className="py-1.5 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors hover:brightness-95 rounded-lg cursor-pointer"
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
            className="w-full py-2 text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-black/5 rounded-lg cursor-pointer"
            style={{ border: `1px dashed ${T.line}`, color: T.muted }}
          >
            <Plus size={13} /> Adicionar torre vazia
          </button>
        </div>
      )}
    </aside>
  );
};
