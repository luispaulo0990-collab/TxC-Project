import React from "react";
import {
  LABEL_W,
  TOWER_STRIP,
  HEADER_H,
  FONT,
  NUM,
  ORANGE,
  ERRO,
  OK,
  BLACK,
  DIAS_MES,
} from "../../constants/theme";
import { D, fmtBR, diffDays, hoje } from "../../utils/dateUtils";
import { contraste } from "../../utils/geometryUtils";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Minus,
  Upload,
  Download,
  Save,
} from "lucide-react";

// ── Flags de Exibição de Linhas Temporais ──
// Linha de Hoje mantida aparente; Linhas de Marcos e Realizado tracejado ocultadas
const EXIBIR_LINHA_HOJE = true;
const EXIBIR_MARCOS = false;
const EXIBIR_LINHAS_REALIZADO = false;
const EXIBIR_PONTO_CORTE_HOJE = false;

export const FlowlineChart = ({
  T,
  proj,
  rows,
  rowIdx,
  grupos,
  meses,
  chartW,
  chartH,
  rowH,
  setRowH,
  pxPerDay,
  setPxPerDay,
  xOf,
  yMid,
  ativVisiveis,
  alertas = [],
  incoerencias = [],
  exibirRealizado = true,
  setExibirRealizado,
  exibirCruzamentos = true,
  setExibirCruzamentos,
  showActivities = true,
  setShowActivities,
  onAbrirModal,
  onSalvar,
  selId,
  setSelId,
  dragInfo,
  axisRef,
  chartRef,
  onDown,
  onMove,
  onUp,
  onDropActivity,
  podeEditar = true,
  podeImportar = true,
}) => {
  const dataHoje = hoje();
  const xHoje = xOf(dataHoje);

  const handleDrop = (e) => {
    e.preventDefault();
    if (!podeEditar) return;
    const actId = e.dataTransfer.getData("text/plain");
    if (!actId || !onDropActivity || !chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onDropActivity(actId, offsetX, offsetY);
  };

  return (
    <main className="flex-1 min-w-0 flex flex-col overflow-hidden select-none" style={{ background: T.bg }}>
      {/* ── Barra Superior de Controles e Ferramentas do Gráfico ── */}
      <div
        className="flex items-center justify-between px-3 py-1.5 shrink-0 border-b select-none flex-wrap gap-2 shadow-xs"
        style={{
          background: T.panel,
          borderColor: T.line,
        }}
      >
        {/* Lado Esquerdo: Alternâncias de Visibilidade do Gráfico */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {setExibirRealizado && (
            <button
              onClick={() => setExibirRealizado(!exibirRealizado)}
              className="px-2.5 py-1 text-xs flex items-center gap-1.5 rounded-lg transition-all font-semibold cursor-pointer"
              style={{
                background: exibirRealizado ? "rgba(16, 185, 129, 0.12)" : T.raised,
                border: `1px solid ${exibirRealizado ? "rgba(16, 185, 129, 0.35)" : T.line}`,
                color: exibirRealizado ? "#059669" : T.muted,
              }}
              title={exibirRealizado ? "Ocultar apontamentos de realizado" : "Exibir apontamentos de realizado"}
            >
              {exibirRealizado ? <Eye size={13} style={{ color: "#10B981" }} /> : <EyeOff size={13} />}
              <span>Visão do Realizado</span>
              <span
                className="text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider"
                style={{
                  background: exibirRealizado ? "#10B981" : "rgba(0,0,0,0.08)",
                  color: exibirRealizado ? "#fff" : T.dim,
                }}
              >
                {exibirRealizado ? "ON" : "OFF"}
              </span>
            </button>
          )}

          {setExibirCruzamentos && (
            <button
              onClick={() => setExibirCruzamentos(!exibirCruzamentos)}
              className="px-2.5 py-1 text-xs flex items-center gap-1.5 rounded-lg transition-all font-semibold cursor-pointer"
              style={{
                background: exibirCruzamentos ? "rgba(220, 38, 38, 0.12)" : T.raised,
                border: `1px solid ${exibirCruzamentos ? "rgba(220, 38, 38, 0.35)" : T.line}`,
                color: exibirCruzamentos ? "#DC2626" : T.muted,
              }}
              title={exibirCruzamentos ? "Ocultar apontamentos de cruzamentos no gráfico" : "Exibir apontamentos de cruzamentos no gráfico"}
            >
              <AlertTriangle size={13} style={{ color: exibirCruzamentos ? "#DC2626" : T.dim }} />
              <span>Cruzamentos</span>
              <span
                className="text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider"
                style={{
                  background: exibirCruzamentos ? "#EF4444" : "rgba(0,0,0,0.08)",
                  color: exibirCruzamentos ? "#fff" : T.dim,
                }}
              >
                {exibirCruzamentos ? "ON" : "OFF"}
              </span>
            </button>
          )}
        </div>

        {/* Lado Direito: Controles de Altura dos Pavimentos, Zoom do Gráfico e Ações (Superior Direito) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Vertical: Altura das Faixas de Pavimento */}
          {setRowH && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.dim }}>
                Altura:
              </span>
              <div
                className="flex items-center rounded-lg px-1.5 py-0.5"
                style={{ background: T.raised, border: `1px solid ${T.line}` }}
              >
                <button
                  onClick={() => setRowH((h) => Math.max(18, h - 3))}
                  className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
                  style={{ color: T.muted }}
                  title="Diminuir altura dos pavimentos (comprimir)"
                >
                  <Minus size={12} />
                </button>
                <span className="text-[13px] px-1.5 font-bold" style={{ ...NUM, color: T.text, minWidth: 36, textAlign: "center" }}>
                  {rowH}px
                </span>
                <button
                  onClick={() => setRowH((h) => Math.min(60, h + 3))}
                  className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
                  style={{ color: T.muted }}
                  title="Aumentar altura dos pavimentos (expandir)"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Zoom Horizontal: Escala de Dias / Tempo */}
          {setPxPerDay && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.dim }}>
                Zoom:
              </span>
              <div
                className="flex items-center rounded-lg px-1.5 py-0.5"
                style={{ background: T.raised, border: `1px solid ${T.line}` }}
              >
                <button
                  onClick={() => setPxPerDay((z) => Math.max(1.2, z / 1.25))}
                  className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
                  style={{ color: T.muted }}
                  title="Diminuir Zoom"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[13px] px-1.5 font-bold" style={{ ...NUM, color: T.text, minWidth: 42, textAlign: "center" }}>
                  {Math.round(pxPerDay * 30)}%
                </span>
                <button
                  onClick={() => setPxPerDay((z) => Math.min(16, z * 1.25))}
                  className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
                  style={{ color: T.muted }}
                  title="Aumentar Zoom"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  onClick={() => setPxPerDay(4.2)}
                  className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer ml-0.5"
                  style={{ color: T.muted }}
                  title="Restaurar Zoom Padrão"
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Separador vertical sutil */}
          <div className="h-5 w-px mx-0.5" style={{ background: T.line }} />

          {/* Ações no Canto Superior Direito: Importar, Exportar e Salvar Obra */}
          {!podeEditar && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10B981",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              Modo Visualizador
            </span>
          )}

          {onAbrirModal && podeImportar && (
            <button
              onClick={() => onAbrirModal("importmenu")}
              className="px-2.5 py-1 text-[12.5px] flex items-center gap-1.5 rounded-lg font-semibold transition-all hover:bg-black/5 active:scale-95 cursor-pointer"
              style={{
                background: T.raised,
                border: `1px solid ${T.line}`,
                color: T.text,
              }}
              title="Importar planilha de atividades ou avanços"
            >
              <Upload size={13} style={{ color: ORANGE }} />
              <span>Importar</span>
            </button>
          )}

          {onAbrirModal && (
            <button
              onClick={() => onAbrirModal("exportar")}
              className="px-2.5 py-1 text-[12.5px] flex items-center gap-1.5 rounded-lg font-semibold transition-all hover:bg-black/5 active:scale-95 cursor-pointer"
              style={{
                background: T.raised,
                border: `1px solid ${T.line}`,
                color: T.text,
              }}
              title="Exportar em Excel (.xlsx) ou Imagem (.png)"
            >
              <Download size={13} style={{ color: "#059669" }} />
              <span>Exportar</span>
            </button>
          )}

          {onSalvar && podeEditar && (
            <button
              onClick={() => onSalvar(proj)}
              className="px-3.5 py-1 text-[12.5px] flex items-center gap-1.5 rounded-lg font-bold transition-all hover:brightness-110 active:scale-95 text-white cursor-pointer shadow-xs"
              style={{
                background: "linear-gradient(135deg, #FE5000 0%, #FF6824 100%)",
                boxShadow: "0 2px 8px rgba(254, 80, 0, 0.28)",
              }}
              title="Salvar alterações da obra no Supabase"
            >
              <Save size={14} />
              <span>Salvar Obra</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto" onClick={() => setSelId(null)}>
        <div style={{ width: LABEL_W + chartW, position: "relative" }}>
          {/* Cabeçalho do Eixo X fixo no topo */}
          <div className="flex sticky top-0" style={{ zIndex: 20 }}>
            <div
              className="sticky left-0 flex items-center justify-between px-3 shadow-sm"
              style={{ width: LABEL_W, height: HEADER_H, background: BLACK, zIndex: 30 }}
            >
              <div className="flex flex-col min-w-0">
                <span style={{ fontSize: 11, letterSpacing: 1.5, color: "#fff", fontWeight: 800 }}>
                  CAMINHO
                </span>
                <span style={{ ...NUM, fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
                  {rows.length} locais
                </span>
              </div>
            </div>

            <svg ref={axisRef} width={chartW} height={HEADER_H} style={{ display: "block" }}>
              <rect x={0} y={0} width={chartW} height={HEADER_H} fill={BLACK} />
              {meses.map((m, i) => {
                const x0 = m.x0 != null ? m.x0 : Math.max(0, xOf(m.ini));
                const x1 = m.x1 != null ? m.x1 : Math.min(chartW, xOf(m.fim));
                return (
                  <g key={i}>
                    <rect
                      x={x0}
                      y={0}
                      width={Math.max(0, x1 - x0)}
                      height={24}
                      fill={i % 2 ? "rgba(255,255,255,0.05)" : "transparent"}
                    />
                    {x1 - x0 > 34 && (
                      <text
                        x={(x0 + x1) / 2}
                        y={17}
                        fill="#fff"
                        fontFamily={FONT}
                        fontSize={13}
                        fontWeight="700"
                        textAnchor="middle"
                        letterSpacing="1"
                      >
                        {m.label}
                      </text>
                    )}
                    <line x1={x0} y1={0} x2={x0} y2={HEADER_H} stroke="rgba(255,255,255,0.28)" strokeWidth={1} />
                    {m.semanas.map((s, j) => {
                      const sx = s.xDia != null ? s.xDia * pxPerDay : xOf(s.d);
                      const wSemana = (s.dias || 5) * pxPerDay;
                      return (
                        <g key={j}>
                          <line x1={sx} y1={24} x2={sx} y2={HEADER_H} stroke="rgba(255,255,255,0.1)" strokeWidth={0.6} />
                          {pxPerDay > 2 && (
                            <text
                              x={sx + wSemana / 2}
                              y={39}
                              fill="rgba(255,255,255,0.65)"
                              fontFamily={FONT}
                              fontSize={10.5}
                              fontWeight="600"
                              textAnchor="middle"
                            >
                              {s.n}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
              <line x1={0} y1={24} x2={chartW} y2={24} stroke="rgba(255,255,255,0.22)" strokeWidth={0.6} />
              
              {/* Indicador de Data de Hoje no Eixo */}
              {EXIBIR_LINHA_HOJE && xHoje >= 0 && xHoje <= chartW && (
                <g>
                  <line x1={xHoje} y1={0} x2={xHoje} y2={HEADER_H} stroke={ORANGE} strokeWidth={1.5} />
                  <rect x={xHoje - 20} y={30} width={40} height={15} rx={2} fill={ORANGE} />
                  <text x={xHoje} y={41.5} fill="#fff" fontFamily={FONT} fontSize={10} fontWeight="800" textAnchor="middle">
                    HOJE
                  </text>
                </g>
              )}

              {EXIBIR_MARCOS && proj.marcos.map((mk) => (
                <rect key={mk.id} x={xOf(D(mk.data)) - 2} y={26} width={4} height={20} fill={mk.cor} />
              ))}
            </svg>
          </div>

          {/* Corpo do Gráfico com Eixo Y fixo à esquerda */}
          <div className="flex">
            <div
              className="sticky left-0 shadow-sm"
              style={{ width: LABEL_W, zIndex: 10, background: T.labelBg, borderRight: `1px solid ${T.line}` }}
            >
              {grupos.map((g) => (
                <div key={g.torreId} className="flex" style={{ height: (g.fim - g.ini + 1) * rowH }}>
                  <div className="flex items-center justify-center select-none" style={{ width: TOWER_STRIP, background: T.strip }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: T.stripText,
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        letterSpacing: 2,
                      }}
                    >
                      {g.nome}
                    </span>
                  </div>
                  <div className="flex-1">
                    {rows.slice(g.ini, g.fim + 1).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-end pr-2"
                        style={{
                          height: rowH,
                          borderBottom: `0.5px solid ${T.row}`,
                          background: r.tipo === "TIPO" ? T.labelBg : T.labelBgAlt,
                        }}
                      >
                        <span
                          style={{
                            ...NUM,
                            fontSize: Math.min(13.5, Math.max(11, rowH * 0.44)),
                            fontWeight: 600,
                            color: r.tipo === "TIPO" ? T.label : T.labelAlt,
                          }}
                        >
                          {r.nome}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* SVG Principal do Gráfico */}
            <svg
              ref={chartRef}
              width={chartW}
              height={chartH}
              style={{ display: "block", background: T.surface }}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={handleDrop}
            >
              {rows.map((r, i) => (
                <rect
                  key={r.id}
                  x={0}
                  y={i * rowH}
                  width={chartW}
                  height={rowH}
                  fill={r.tipo === "TIPO" ? T.surface : T.band}
                />
              ))}

              {meses.map((m, i) => {
                const x0 = m.x0 != null ? m.x0 : xOf(m.ini);
                return (
                  <g key={i}>
                    {m.semanas.map((s, j) => {
                      const sx = s.xDia != null ? s.xDia * pxPerDay : xOf(s.d);
                      return (
                        <line
                          key={j}
                          x1={sx}
                          y1={0}
                          x2={sx}
                          y2={chartH}
                          stroke={T.grid}
                          strokeWidth={0.5}
                        />
                      );
                    })}
                    <line
                      x1={x0}
                      y1={0}
                      x2={x0}
                      y2={chartH}
                      stroke={T.gridMes}
                      strokeWidth={0.8}
                    />
                  </g>
                );
              })}

              {rows.map((r, i) => (
                <line
                  key={r.id}
                  x1={0}
                  y1={(i + 1) * rowH}
                  x2={chartW}
                  y2={(i + 1) * rowH}
                  stroke={T.row}
                  strokeWidth={0.5}
                />
              ))}

              {grupos.map((g) => (
                <line
                  key={g.torreId}
                  x1={0}
                  y1={g.ini * rowH}
                  x2={chartW}
                  y2={g.ini * rowH}
                  stroke={T.gridMes}
                  strokeWidth={1.2}
                />
              ))}

              {/* Linha Vertical de Hoje no Gráfico */}
              {EXIBIR_LINHA_HOJE && xHoje >= 0 && xHoje <= chartW && (
                <line
                  x1={xHoje}
                  y1={0}
                  x2={xHoje}
                  y2={chartH}
                  stroke={ORANGE}
                  strokeWidth={1.4}
                  strokeDasharray="4 3"
                  opacity={0.7}
                  pointerEvents="none"
                />
              )}

              {/* Linhas de Marcos (Ocultadas conforme solicitação) */}
              {EXIBIR_MARCOS && proj.marcos.map((mk) => (
                <line
                  key={mk.id}
                  x1={xOf(D(mk.data))}
                  y1={0}
                  x2={xOf(D(mk.data))}
                  y2={chartH}
                  stroke={mk.cor}
                  strokeWidth={1.4}
                  strokeDasharray="5 3"
                  opacity={0.8}
                />
              ))}

              {/* Atividades Modo BLOCO */}
              {ativVisiveis
                .filter((a) => a.modo === "BLOCO")
                .map((a) => {
                  const i = rowIdx[a.locIniId];
                  const f = rowIdx[a.locFimId];
                  const y = Math.min(i, f) * rowH;
                  const h = (Math.abs(f - i) + 1) * rowH;
                  const x = xOf(D(a.dataIni));
                  const w = Math.max(3, xOf(D(a.dataFim)) - x);
                  const on = selId === a.id;
                  const cabe = w > a.nome.length * 5.4;
                  const tc = contraste(a.cor);
                  const avancoPct = Math.min(100, Math.max(0, a.avanco || 0));

                  return (
                    <g
                      key={a.id}
                      style={{ cursor: "pointer" }}
                      onPointerDown={(e) => onDown(e, a, "move")}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelId(a.id);
                      }}
                    >
                      {on && (
                        <rect
                          x={x - 2.5}
                          y={y - 0.5}
                          width={w + 5}
                          height={h - 1}
                          fill="none"
                          stroke={ORANGE}
                          strokeWidth={2}
                        />
                      )}
                      <rect
                        x={x}
                        y={y + 2}
                        width={w}
                        height={h - 4}
                        fill={a.cor}
                        fillOpacity={0.85}
                        stroke={a.cor}
                        strokeWidth={0.5}
                      />

                      {/* Preenchimento de Avanço no Bloco (Sempre positivo em verde) */}
                      {avancoPct > 0 && exibirRealizado && (() => {
                        const corBlocoAvanco = OK;

                        return (
                          <rect
                            x={x}
                            y={y + 2}
                            width={(w * avancoPct) / 100}
                            height={h - 4}
                            fill={corBlocoAvanco}
                            fillOpacity={0.4}
                            stroke={corBlocoAvanco}
                            strokeWidth={1}
                          />
                        );
                      })()}

                      {cabe ? (
                        <text
                          x={x + w / 2}
                          y={y + h / 2 + 3.5}
                          fill={tc}
                          fontFamily={FONT}
                          fontSize={Math.min(10.5, h * 0.5)}
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {a.nome} {avancoPct > 0 && exibirRealizado ? `(${avancoPct}%)` : ""}
                        </text>
                      ) : (
                        <text
                          x={x + w / 2}
                          y={y + h / 2}
                          fill={tc}
                          fontFamily={FONT}
                          fontSize={9}
                          fontWeight="700"
                          textAnchor="middle"
                          transform={`rotate(-90 ${x + w / 2} ${y + h / 2})`}
                        >
                          {a.nome}
                        </text>
                      )}
                    </g>
                  );
                })}

              {/* Linhas Realizadas (tracejadas em vermelho - Ocultadas conforme solicitação) */}
              {EXIBIR_LINHAS_REALIZADO && ativVisiveis
                .filter((a) => a.modo === "LINHA" && a.realIni && a.realFim)
                .map((a) => {
                  const x1 = xOf(D(a.realIni));
                  const y1 = yMid(a.locIniId);
                  const x2 = xOf(D(a.realFim));
                  const y2 = yMid(a.locFimId);
                  return (
                    <g key={"r" + a.id} pointerEvents="none">
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={ERRO}
                        strokeWidth={2.5}
                        strokeDasharray="6 4"
                      />
                      <circle cx={x1} cy={y1} r={3.5} fill={ERRO} />
                      <circle cx={x2} cy={y2} r={3.5} fill={ERRO} />
                    </g>
                  );
                })}

              {/* Atividades Modo LINHA (Planejadas e Avanço Físico) */}
              {ativVisiveis
                .filter((a) => a.modo === "LINHA")
                .map((a) => {
                  const x1 = xOf(D(a.dataIni));
                  const y1 = yMid(a.locIniId);
                  const x2 = xOf(D(a.dataFim));
                  const y2 = yMid(a.locFimId);
                  const on = selId === a.id;
                  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
                  const mx = x1 + (x2 - x1) * 0.5;
                  const my = y1 + (y2 - y1) * 0.5 - 5;

                  const iIdx = rowIdx[a.locIniId] ?? 0;
                  const fIdx = rowIdx[a.locFimId] ?? 0;
                  const nLoc = Math.abs(fIdx - iIdx) + 1;
                  const durDias = Math.max(1, diffDays(D(a.dataIni), D(a.dataFim)));
                  const ritmoMes = (nLoc / durDias) * DIAS_MES;

                  // Cálculo do Ponto de Avanço Físico
                  let avancoRatio = 0;
                  if (a.pavimentoAtualId && rowIdx[a.pavimentoAtualId] != null) {
                    const pavIdx = rowIdx[a.pavimentoAtualId];
                    avancoRatio = Math.abs(pavIdx - iIdx) / Math.max(1, Math.abs(fIdx - iIdx));
                  } else if (a.avanco != null && a.avanco > 0) {
                    avancoRatio = Math.min(1, Math.max(0, a.avanco / 100));
                  } else if (a.realFim) {
                    avancoRatio = 1;
                  }

                  const avancoX = x1 + avancoRatio * (x2 - x1);
                  const avancoY = y1 + avancoRatio * (y2 - y1);
                  const temAvanco = avancoRatio > 0;

                  // Interseção com a Linha de Corte de Hoje
                  const cortaHoje = xHoje >= x1;
                  const corteRatio = cortaHoje ? Math.min(1, (xHoje - x1) / Math.max(1, x2 - x1)) : 0;
                  // Avanço realizado sempre em verde (OK), sem criar linhas vermelhas de atraso no gráfico
                  const corAvanco = OK;
                  const corteX = x1 + corteRatio * (x2 - x1);
                  const corteY = y1 + corteRatio * (y2 - y1);

                  return (
                    <g
                      key={a.id}
                      className="group"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelId(a.id);
                      }}
                    >
                      {/* Zona ampla invisível para clique e seleção/arraste do corpo da linha */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="transparent"
                        strokeWidth={24}
                        style={{ cursor: "pointer" }}
                        onPointerDown={(e) => onDown(e, a, "move")}
                        onPointerMove={onMove}
                        onPointerUp={onUp}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelId(a.id);
                        }}
                      />

                      {/* Brilho ao selecionar */}
                      {on && (
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={ORANGE}
                          strokeWidth={8}
                          opacity={0.35}
                          pointerEvents="none"
                        />
                      )}

                      {/* Linha Planejada Base */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={a.cor}
                        strokeWidth={on ? 3.5 : 2.5}
                        strokeOpacity={temAvanco && exibirRealizado ? 0.45 : 1}
                        style={{ cursor: "pointer" }}
                        onPointerDown={(e) => onDown(e, a, "move")}
                        onPointerMove={onMove}
                        onPointerUp={onUp}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelId(a.id);
                        }}
                      />

                      {/* Segmento Executado / Realizado (Avanço Físico Destacado) */}
                      {temAvanco && exibirRealizado && (
                        <g pointerEvents="none">
                          <line
                            x1={x1}
                            y1={y1}
                            x2={avancoX}
                            y2={avancoY}
                            stroke={corAvanco}
                            strokeWidth={on ? 4.5 : 3.5}
                            strokeLinecap="round"
                          />
                          {/* Jóia / Marcador de Ponto de Avanço Atual */}
                          <circle cx={avancoX} cy={avancoY} r={5} fill={corAvanco} stroke="#FFFFFF" strokeWidth={1.5} />
                          {pxPerDay > 2 && (
                            <text
                              x={avancoX + 7}
                              y={avancoY - 3}
                              fill={corAvanco}
                              fontFamily={FONT}
                              fontSize={8.5}
                              fontWeight="700"
                              style={{ ...NUM }}
                            >
                              {Math.round(avancoRatio * 100)}%
                            </text>
                          )}
                        </g>
                      )}

                      {/* Ponto de corte da Linha Hoje quando a atividade está selecionada (ocultado) */}
                      {EXIBIR_PONTO_CORTE_HOJE && on && cortaHoje && xHoje <= x2 && (
                        <g pointerEvents="none">
                          <circle cx={corteX} cy={corteY} r={4} fill={ORANGE} stroke="#FFFFFF" strokeWidth={1.2} />
                        </g>
                      )}

                      {/* Alerta de Incoerência de Predecessora nesta Atividade */}
                      {(() => {
                        const inc = incoerencias.find((x) => x.atividadeId === a.id);
                        if (!inc) return null;
                        return (
                          <g transform={`translate(${x1 - 18}, ${y1 - 18})`} pointerEvents="none">
                            <rect x={0} y={0} width={16} height={16} rx={4} fill="#EF4444" stroke="#FFFFFF" strokeWidth={1.5} />
                            <text x={8} y={12} fill="#FFFFFF" fontFamily={FONT} fontSize={10} fontWeight="900" textAnchor="middle">
                              !
                            </text>
                          </g>
                        );
                      })()}

                      {/* Rótulo com o nome da atividade ao longo da linha */}
                      {pxPerDay > 2.2 && (
                        <text
                          x={mx}
                          y={my}
                          fill={a.cor}
                          fontFamily={FONT}
                          fontSize={12}
                          fontWeight="700"
                          stroke={T.surface}
                          strokeWidth={2.5}
                          paintOrder="stroke fill"
                          textAnchor="middle"
                          style={{ cursor: "pointer", userSelect: "none" }}
                          onPointerDown={(e) => onDown(e, a, "move")}
                          onPointerMove={onMove}
                          onPointerUp={onUp}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelId(a.id);
                          }}
                          transform={`rotate(${ang} ${mx} ${my})`}
                        >
                          {a.nome}
                        </text>
                      )}

                      {/* Controles e Pontas de Inclinação (quando selecionada e com permissão) */}
                      {on && podeEditar && (
                        <>
                          {/* Pílula Central de Inclinação / Velocidade */}
                          <g
                            transform={`translate(${mx}, ${my - 18})`}
                            style={{ cursor: "ew-resize" }}
                            onPointerDown={(e) => onDown(e, a, "tilt")}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                          >
                            <rect
                              x={-48}
                              y={-10}
                              width={96}
                              height={20}
                              rx={10}
                              fill={ORANGE}
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                              className="shadow-md"
                            />
                            <text
                              x={0}
                              y={4}
                              fill="#FFFFFF"
                              fontFamily={FONT}
                              fontSize={10.5}
                              fontWeight="700"
                              textAnchor="middle"
                              style={{ ...NUM }}
                            >
                              ⚡ {ritmoMes.toFixed(1)} pav/mês ↔
                            </text>
                          </g>

                          {/* Ponta Inicial */}
                          <g
                            style={{ cursor: "all-scroll" }}
                            onPointerDown={(e) => onDown(e, a, "ini")}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                          >
                            <circle cx={x1} cy={y1} r={14} fill="transparent" />
                            <circle cx={x1} cy={y1} r={6} fill={T.surface} stroke={ORANGE} strokeWidth={2.5} />
                            <circle cx={x1} cy={y1} r={2} fill={ORANGE} />
                          </g>

                          {/* Ponta Final / Topo */}
                          <g
                            style={{ cursor: "ew-resize" }}
                            onPointerDown={(e) => onDown(e, a, "fim")}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                          >
                            <circle cx={x2} cy={y2} r={16} fill="transparent" />
                            <circle
                              cx={x2}
                              cy={y2}
                              r={8}
                              fill={ORANGE}
                              stroke="#FFFFFF"
                              strokeWidth={2.5}
                              className="shadow-sm"
                            />
                            <path
                              d={`M${x2 - 3},${y2} L${x2 + 3},${y2} M${x2 - 1},${y2 - 2} L${x2 - 3},${y2} L${x2 - 1},${y2 + 2} M${x2 + 1},${y2 - 2} L${x2 + 3},${y2} L${x2 + 1},${y2 + 2}`}
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                              strokeLinecap="round"
                            />
                          </g>
                        </>
                      )}
                    </g>
                  );
                })}

              {/* Alertas de Cruzamento */}
              {exibirCruzamentos &&
                alertas.map((al) => (
                  <g key={al.id} pointerEvents="none">
                    <circle cx={al.x} cy={al.y} r={7.5} fill={T.surface} stroke={ERRO} strokeWidth={1.8} />
                    <path
                      d={`M${al.x - 3},${al.y - 3} L${al.x + 3},${al.y + 3} M${al.x + 3},${al.y - 3} L${al.x - 3},${al.y + 3}`}
                      stroke={ERRO}
                      strokeWidth={1.8}
                    />
                  </g>
                ))}
            </svg>
          </div>
        </div>
      </div>

      {/* HUD Flutuante com Feedback em Tempo Real */}
      {dragInfo?.active && (
        <div
          className="fixed pointer-events-none z-50 px-3 py-2 rounded shadow-2xl border flex flex-col gap-1 transition-all"
          style={{
            left: Math.min(window.innerWidth - 240, Math.max(10, dragInfo.x + 15)),
            top: Math.min(window.innerHeight - 100, Math.max(10, dragInfo.y - 65)),
            background: "rgba(0, 0, 0, 0.88)",
            borderColor: ORANGE,
            color: "#FFFFFF",
            fontFamily: FONT,
            backdropFilter: "blur(6px)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-orange-400">
              {dragInfo.modo === "move"
                ? "↔️ Movendo no Tempo"
                : dragInfo.modo === "ini"
                ? "📍 Ajustando Ponto Inicial"
                : "⚡ Inclinando Linha (Velocidade)"}
            </span>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-600 text-white"
              style={{ ...NUM }}
            >
              {dragInfo.ritmoMes.toFixed(2)} pav/mês
            </span>
          </div>
          <div className="text-xs flex items-center justify-between gap-4 font-medium" style={{ ...NUM, fontSize: 11 }}>
            <span>
              {fmtBR(D(dragInfo.di))} ➔ {fmtBR(D(dragInfo.df))}
            </span>
            <span className="text-gray-300">
              {dragInfo.dias} dias ({(dragInfo.dias / 30).toFixed(1)} m)
            </span>
          </div>
        </div>
      )}
    </main>
  );
};
