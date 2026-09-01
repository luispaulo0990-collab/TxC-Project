import React from "react";
import { LogoUnita } from "../common/LogoUnita";
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
import { D, fmtBR, diffDays } from "../../utils/dateUtils";
import { contraste } from "../../utils/geometryUtils";

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
  pxPerDay,
  xOf,
  yMid,
  ativVisiveis,
  alertas = [],
  selId,
  setSelId,
  dragInfo,
  axisRef,
  chartRef,
  onDown,
  onMove,
  onUp,
  onDropActivity,
}) => {
  const handleDrop = (e) => {
    e.preventDefault();
    const actId = e.dataTransfer.getData("text/plain");
    if (!actId || !onDropActivity || !chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onDropActivity(actId, offsetX, offsetY);
  };
  return (
    <main className="flex-1 min-w-0 flex flex-col overflow-hidden select-none" style={{ background: T.bg }}>
      <div className="flex-1 overflow-auto" onClick={() => setSelId(null)}>
        <div style={{ width: LABEL_W + chartW, position: "relative" }}>
          {/* Cabeçalho do Eixo X fixo no topo */}
          <div className="flex sticky top-0" style={{ zIndex: 20 }}>
            <div
              className="sticky left-0 flex items-center px-3 shadow-sm"
              style={{ width: LABEL_W, height: HEADER_H, background: BLACK, zIndex: 30, gap: 8 }}
            >
              <LogoUnita ink="#fff" height={16} />
              <div className="flex flex-col">
                <span style={{ fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>
                  CAMINHO
                </span>
                <span style={{ ...NUM, fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
                  {rows.length} locais
                </span>
              </div>
            </div>

            <svg ref={axisRef} width={chartW} height={HEADER_H} style={{ display: "block" }}>
              <rect x={0} y={0} width={chartW} height={HEADER_H} fill={BLACK} />
              {meses.map((m, i) => {
                const x0 = Math.max(0, xOf(m.ini));
                const x1 = Math.min(chartW, xOf(m.fim));
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
                        y={16}
                        fill="#fff"
                        fontFamily={FONT}
                        fontSize={11}
                        fontWeight="500"
                        textAnchor="middle"
                        letterSpacing="1"
                      >
                        {m.label}
                      </text>
                    )}
                    <line x1={x0} y1={0} x2={x0} y2={HEADER_H} stroke="rgba(255,255,255,0.28)" strokeWidth={1} />
                    {m.semanas.map((s, j) => {
                      const sx = xOf(s.d);
                      return (
                        <g key={j}>
                          <line x1={sx} y1={24} x2={sx} y2={HEADER_H} stroke="rgba(255,255,255,0.1)" strokeWidth={0.6} />
                          {pxPerDay > 2 && (
                            <text
                              x={sx + 3.5 * pxPerDay}
                              y={39}
                              fill="rgba(255,255,255,0.45)"
                              fontFamily={FONT}
                              fontSize={8.5}
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
              {proj.marcos.map((mk) => (
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
                        fontSize: 10,
                        fontWeight: 700,
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
                            fontSize: Math.min(10, rowH * 0.44),
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

              {meses.map((m, i) => (
                <g key={i}>
                  {m.semanas.map((s, j) => (
                    <line
                      key={j}
                      x1={xOf(s.d)}
                      y1={0}
                      x2={xOf(s.d)}
                      y2={chartH}
                      stroke={T.grid}
                      strokeWidth={0.5}
                    />
                  ))}
                  <line
                    x1={xOf(m.ini)}
                    y1={0}
                    x2={xOf(m.ini)}
                    y2={chartH}
                    stroke={T.gridMes}
                    strokeWidth={0.8}
                  />
                </g>
              ))}

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

              {proj.marcos.map((mk) => (
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
                        fillOpacity={0.92}
                        stroke={a.cor}
                        strokeWidth={0.5}
                      />
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
                          {a.nome}
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
                      {on &&
                        [
                          ["ini", x],
                          ["fim", x + w],
                        ].map(([k, hx]) => (
                          <rect
                            key={k}
                            x={hx - 3}
                            y={y + h / 2 - 6}
                            width={6}
                            height={12}
                            fill={ORANGE}
                            style={{ cursor: "ew-resize" }}
                            onPointerDown={(e) => onDown(e, a, k)}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ))}
                    </g>
                  );
                })}

              {/* Linhas Realizadas (tracejadas em vermelho) */}
              {ativVisiveis
                .filter((a) => a.modo === "LINHA" && a.realIni && a.realFim)
                .map((a) => {
                  const x1 = xOf(D(a.realIni));
                  const y1 = yMid(a.locIniId);
                  const x2 = xOf(D(a.realFim));
                  const y2 = yMid(a.locFimId);
                  return (
                    <line
                      key={"r" + a.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={ERRO}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      pointerEvents="none"
                    />
                  );
                })}

              {/* Atividades Modo LINHA (Planejadas) */}
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

                      {/* Linha principal */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={a.cor}
                        strokeWidth={on ? 3.5 : 2.5}
                        style={{ cursor: "pointer" }}
                        onPointerDown={(e) => onDown(e, a, "move")}
                        onPointerMove={onMove}
                        onPointerUp={onUp}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelId(a.id);
                        }}
                      />

                      {/* Rótulo com o nome da atividade ao longo da linha */}
                      {pxPerDay > 2.2 && (
                        <text
                          x={mx}
                          y={my}
                          fill={a.cor}
                          fontFamily={FONT}
                          fontSize={9.5}
                          fontWeight="600"
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

                      {/* Controles e Pontas de Inclinação (quando a linha está selecionada) */}
                      {on && (
                        <>
                          {/* Pílula Central de Inclinação / Velocidade (Midpoint Tilt Knob) */}
                          <g
                            transform={`translate(${mx}, ${my - 16})`}
                            style={{ cursor: "ew-resize" }}
                            onPointerDown={(e) => onDown(e, a, "tilt")}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                          >
                            <rect
                              x={-42}
                              y={-9}
                              width={84}
                              height={18}
                              rx={9}
                              fill={ORANGE}
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                              className="shadow-md"
                            />
                            <text
                              x={0}
                              y={3.5}
                              fill="#FFFFFF"
                              fontFamily={FONT}
                              fontSize={9}
                              fontWeight="700"
                              textAnchor="middle"
                              style={{ ...NUM }}
                            >
                              ⚡ {ritmoMes.toFixed(1)} pav/mês ↔
                            </text>
                            <title>Arraste horizontalmente para inclinar a linha e alterar a velocidade</title>
                          </g>

                          {/* Ponta Inicial (Âncora Inferior: altera Início e Pavimento Inicial) */}
                          <g
                            style={{ cursor: "all-scroll" }}
                            onPointerDown={(e) => onDown(e, a, "ini")}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                          >
                            <circle cx={x1} cy={y1} r={14} fill="transparent" />
                            <circle cx={x1} cy={y1} r={6} fill={T.surface} stroke={ORANGE} strokeWidth={2.5} />
                            <circle cx={x1} cy={y1} r={2} fill={ORANGE} />
                            <title>Arraste para alterar o ponto de início (data e pavimento)</title>
                          </g>

                          {/* Ponta Final / Topo (Âncora de Velocidade e Inclinação) */}
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
                            <title>Arraste horizontalmente para inclinar a linha: Esquerda = Acelera | Direita = Desacelera</title>
                          </g>
                        </>
                      )}
                    </g>
                  );
                })}

              {/* Alertas de Cruzamento / Choque de ritmo */}
              {alertas.map((al) => (
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

      {/* HUD Flutuante com Feedback em Tempo Real durante o arraste/inclinação */}
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
                : "⚡ Inclinando Linha (Ajuste de Velocidade)"}
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

