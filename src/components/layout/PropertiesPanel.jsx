import React, { useState } from "react";
import {
  X,
  PanelRightOpen,
  TrendingUp,
  AlertTriangle,
  Copy,
  Trash2,
  CheckCircle2,
  GitBranch,
  Users,
} from "lucide-react";
import { Campo } from "../common/Campo";
import { Sel } from "../common/Sel";
import { Metr } from "../common/Metr";
import { ComentariosAtividade } from "../common/ComentariosAtividade";
import { PALETTE, ORANGE, ERRO, OK, NUM } from "../../constants/theme";
import { D, fmtBR, hoje, iso } from "../../utils/dateUtils";
import { calcularStatusAtividade } from "../../utils/statusUtils";

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
  onAbrirModalApontar,
  user,
  podeEditar = true,
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
            Selecione uma atividade no gráfico ou na lista para editar suas propriedades e apontar avanços.
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
        const avancoAtual = sel.avanco != null ? Number(sel.avanco) : 0;

        return (
          <div className="p-4">
            {!podeEditar && (
              <div
                className="mb-3 py-1 px-2.5 rounded-md text-[10.5px] font-bold text-center uppercase tracking-wider"
                style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.25)" }}
              >
                Modo Visualizador (Somente Leitura)
              </div>
            )}
            <div className="flex items-start gap-2 mb-4 pr-6">
              <div className="w-1 self-stretch rounded-xs" style={{ background: sel.cor }} />
              <input
                value={sel.nome}
                readOnly={!podeEditar}
                onChange={(e) => upA(sel.id, { nome: e.target.value })}
                className="flex-1 text-sm bg-transparent outline-none py-0.5 font-bold"
                style={{ color: T.text, cursor: podeEditar ? "text" : "default" }}
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

            {sel.modo === "BLOCO" ? (
              <Campo T={T} label="Pavimento onde aparecerá o Bloco">
                <Sel
                  T={T}
                  value={sel.locIniId || locais[0]?.id}
                  onChange={(v) => upA(sel.id, { locIniId: v, locFimId: v })}
                  opts={locais}
                />
              </Campo>
            ) : (
              <Campo T={T} label="Escopo de pavimentos">
                <div className="grid grid-cols-2 gap-1.5">
                  <Sel T={T} value={sel.locIniId} onChange={(v) => upA(sel.id, { locIniId: v })} opts={locais} />
                  <Sel T={T} value={sel.locFimId} onChange={(v) => upA(sel.id, { locFimId: v })} opts={locais} />
                </div>
              </Campo>
            )}

            {/* Predecessora & Defasagem */}
            <Campo T={T} label="Atividade Predecessora (Dependência)">
              <div className="flex flex-col gap-1.5">
                <select
                  value={sel.predecessoraId || ""}
                  onChange={(e) => upA(sel.id, { predecessoraId: e.target.value || null })}
                  className="text-xs px-2 py-1.5 outline-none rounded-xs w-full truncate cursor-pointer"
                  style={{
                    border: `1px solid ${T.line}`,
                    background: T.input,
                    color: T.text,
                  }}
                >
                  <option value="">Sem predecessora (Independente)</option>
                  {proj.atividades
                    .filter((a) => a.id !== sel.id && a.torreId === sel.torreId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                </select>
                {sel.predecessoraId && (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[11px]" style={{ color: T.dim }}>Defasagem (dias):</span>
                    <input
                      type="number"
                      min={0}
                      value={sel.defasagemDias || 0}
                      onChange={(e) => upA(sel.id, { defasagemDias: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-16 text-xs px-1.5 py-1 outline-none rounded-xs"
                      style={{
                        border: `1px solid ${T.line}`,
                        background: T.input,
                        color: T.text,
                        ...NUM,
                      }}
                    />
                  </div>
                )}
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
              <div className="text-[9.5px] mt-1" style={{ color: T.dim }}>
                Seg a Sex (finais de semana ajustam p/ próxima segunda)
              </div>
            </Campo>

            {/* ── Seção de Avanço Físico e Realizado ── */}
            {(() => {
              const statusInfo = calcularStatusAtividade(sel, proj, {}, hoje());
              const corStatus = statusInfo.emAtraso ? ERRO : OK;

              const handleAtualizarAvanco = (novoValor) => {
                if (!podeEditar) return;
                const v = Math.max(0, Math.min(100, Math.round(Number(novoValor) || 0)));
                const patch = { avanco: v };
                if (v === 100 && !sel.realFim) patch.realFim = iso(hoje());
                if (v > 0 && !sel.realIni) patch.realIni = iso(hoje());
                if (v === 0) {
                  patch.realIni = null;
                  patch.realFim = null;
                }
                upA(sel.id, patch);
              };

              return (
                <div className="mt-3 p-3 rounded-sm border" style={{ background: T.raised, borderColor: T.line }}>
                  <div className="flex items-center justify-between mb-2">
                    <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: corStatus, fontWeight: 700 }} className="flex items-center gap-1">
                      <TrendingUp size={12} /> AVANÇO FÍSICO (% REALIZADO)
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={avancoAtual}
                        disabled={!podeEditar}
                        onChange={(e) => handleAtualizarAvanco(e.target.value)}
                        className="w-14 text-right text-xs font-bold py-0.5 px-1 rounded outline-none border transition-all focus:ring-1 focus:ring-orange-500"
                        style={{
                          ...NUM,
                          background: T.input,
                          borderColor: T.line,
                          color: corStatus,
                        }}
                        title="Digitar percentual de avanço diretamente"
                      />
                      <span className="text-xs font-bold" style={{ color: corStatus }}>%</span>
                    </div>
                  </div>

                  {/* Banner de Status com a Linha de Corte Hoje */}
                  {statusInfo.corteHojeAtivo && (
                    <div
                      className="px-2 py-1 mb-2.5 rounded text-[11px] font-semibold flex items-center justify-between gap-1"
                      style={{
                        background: statusInfo.emAtraso ? `${ERRO}18` : `${OK}18`,
                        color: statusInfo.emAtraso ? ERRO : OK,
                        border: `1px solid ${statusInfo.emAtraso ? ERRO : OK}40`,
                      }}
                    >
                      <span className="flex items-center gap-1">
                        {statusInfo.emAtraso ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                        {statusInfo.emAtraso ? "Em Atraso vs Linha Hoje" : "Em dia com Linha Hoje"}
                      </span>
                      <span style={{ ...NUM, fontSize: 10 }}>
                        Corte: {statusInfo.pavCorteNome || `${statusInfo.pavsPrevistosCorte}º pav`}
                      </span>
                    </div>
                  )}

                  {/* Botão de Apontamento com Mão de Obra */}
                  {onAbrirModalApontar && podeEditar && (
                    <button
                      type="button"
                      onClick={() => onAbrirModalApontar(sel)}
                      className="w-full text-xs py-2 px-3 rounded-md font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:brightness-110 active:scale-[0.99] mb-2.5 cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, #FE5000 0%, #E04600 100%)",
                      }}
                      title="Apontar avanço indicando quantidade de homens e cargos para o Histograma"
                    >
                      <Users size={13} /> Apontar com Mão de Obra
                    </button>
                  )}

                  {/* Botões rápidos */}
                  {podeEditar && (
                    <div className="flex gap-1 mb-2">
                      {[0, 25, 50, 75, 100].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleAtualizarAvanco(v)}
                          className="flex-1 py-1 text-xs font-bold rounded-xs transition-colors cursor-pointer"
                          style={{
                            ...NUM,
                            background: avancoAtual === v ? corStatus : T.panel,
                            color: avancoAtual === v ? "#ffffff" : T.text,
                            border: `1px solid ${avancoAtual === v ? corStatus : T.line}`,
                          }}
                        >
                          {v}%
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Slider de Avanço com step 1 e preenchimento visual */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={avancoAtual}
                    disabled={!podeEditar}
                    onChange={(e) => handleAtualizarAvanco(e.target.value)}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 mb-2.5"
                    style={{
                      background: `linear-gradient(to right, ${corStatus} 0%, ${corStatus} ${avancoAtual}%, rgba(128,128,128,0.2) ${avancoAtual}%, rgba(128,128,128,0.2) 100%)`,
                    }}
                  />
                  {/* Pavimento Atual da Frente */}
                  <div className="mt-2">
                    <label className="text-[10px] font-bold block mb-1" style={{ color: T.dim }}>
                      Pavimento Atual / Executado:
                    </label>
                    <select
                      value={sel.pavimentoAtualId || ""}
                      disabled={!podeEditar}
                      onChange={(e) => upA(sel.id, { pavimentoAtualId: e.target.value || null })}
                      className="w-full text-xs px-2 py-1 rounded outline-none border transition-colors focus:ring-1 focus:ring-orange-500"
                      style={{ background: T.input, borderColor: T.line, color: T.text }}
                    >
                      <option value="">Automático pelo %</option>
                      {locais.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Datas de Início e Fim Reais */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    <div>
                      <label className="text-[9.5px] block mb-0.5" style={{ color: T.dim }}>Início Real:</label>
                      <input
                        type="date"
                        value={sel.realIni || ""}
                        onChange={(e) => upA(sel.id, { realIni: e.target.value || null })}
                        className="w-full text-xs px-1 py-1 rounded outline-none border"
                        style={{ ...NUM, background: T.input, borderColor: T.line, color: T.text, colorScheme: T.scheme }}
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] block mb-0.5" style={{ color: T.dim }}>Fim Real:</label>
                      <input
                        type="date"
                        value={sel.realFim || ""}
                        onChange={(e) => upA(sel.id, { realFim: e.target.value || null })}
                        className="w-full text-xs px-1 py-1 rounded outline-none border"
                        style={{ ...NUM, background: T.input, borderColor: T.line, color: T.text, colorScheme: T.scheme }}
                      />
                    </div>
                  </div>

                  {/* Resumo da Equipe de Mão de Obra */}
                  {(() => {
                    const historico = Array.isArray(sel.historicoAvanco) ? sel.historicoAvanco : [];
                    const ultimo = historico[historico.length - 1];
                    if (!ultimo) return null;
                    return (
                      <div className="mt-2.5 pt-2 border-t text-[10.5px]" style={{ borderColor: T.line }}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold flex items-center gap-1" style={{ color: T.text }}>
                            <Users size={12} style={{ color: ORANGE }} />
                            Última Equipe ({fmtBR(D(ultimo.data))}):
                          </span>
                          <span className="font-bold" style={{ ...NUM, color: ORANGE }}>
                            {ultimo.homensTotal} homens
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {(ultimo.cargos || []).map((c, idx) => (
                            <span
                              key={idx}
                              className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold"
                              style={{ background: `${T.panel}`, border: `1px solid ${T.line}`, color: T.text }}
                            >
                              {c.quantidade} {c.cargo}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

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
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

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

            {/* ── Comentários da Atividade (Supabase) ── */}
            <ComentariosAtividade
              T={T}
              projetoId={proj?.id}
              atividadeId={sel.id}
              user={user}
            />

            {podeEditar && (
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
            )}
          </div>
        );
      })()}
    </aside>
  );
};
