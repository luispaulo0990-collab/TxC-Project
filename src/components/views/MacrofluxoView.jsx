import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Link as LinkIcon,
  Settings2,
  Zap,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Layers,
  Clock,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Cloud,
  Check,
  Database,
  Save,
} from "lucide-react";
import { uid, fmtBR } from "../../utils/dateUtils";
import { BLACK, ORANGE, NUM } from "../../constants/theme";
import {
  getModelosPadraoMacrofluxo,
  auditarIncoerenciasPredecessoras,
  corrigirIncoerenciaPredecessora,
} from "../../utils/macrofluxoUtils";
import { ModalConfirmarExclusao } from "../modals/ModalConfirmarExclusao";

export const MacrofluxoView = ({
  T,
  proj,
  setProj,
  macrofluxos: macrofluxosProp,
  onSalvarMacrofluxo,
  onExcluirMacrofluxo,
  onVoltar,
  onAplicarTorre,
}) => {
  const macrofluxos = (macrofluxosProp && macrofluxosProp.length > 0)
    ? macrofluxosProp
    : (proj?.macrofluxos || []);

  const [selMacroId, setSelMacroId] = useState(macrofluxos[0]?.id || null);
  const [modalConfirmacao, setModalConfirmacao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState(null);

  // Sincronizar seleção inicial caso mude a lista
  useEffect(() => {
    if (!selMacroId && macrofluxos.length > 0) {
      setSelMacroId(macrofluxos[0].id);
    } else if (selMacroId && !macrofluxos.some((m) => m.id === selMacroId)) {
      setSelMacroId(macrofluxos[0]?.id || null);
    }
  }, [macrofluxos, selMacroId]);

  const selMacro = macrofluxos.find((m) => m.id === selMacroId) || null;

  // Auditoria de Incoerências de Predecessoras no Cronograma Atual
  const incoerencias = useMemo(() => auditarIncoerenciasPredecessoras(proj), [proj]);

  const handleCorrigirIncoerencia = (ativId) => {
    const novo = corrigirIncoerenciaPredecessora(proj, ativId);
    setProj?.(novo);
  };

  // Timer para debounce de salvamento no banco
  const saveTimeoutRef = useRef(null);
  const debouncedSave = useCallback((macro) => {
    if (!onSalvarMacrofluxo || !macro) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSalvando(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSalvarMacrofluxo(macro);
        setUltimoSalvo(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.error("Erro no auto-save do macrofluxo:", err);
      } finally {
        setSalvando(false);
      }
    }, 700);
  }, [onSalvarMacrofluxo]);

  const handleSalvarManual = async () => {
    if (!selMacro || !onSalvarMacrofluxo) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSalvando(true);
    try {
      await onSalvarMacrofluxo(selMacro);
      setUltimoSalvo(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error("Erro ao salvar macrofluxo manualmente:", err);
    } finally {
      setSalvando(false);
    }
  };

  const novoMacrofluxo = async () => {
    const novo = {
      id: uid(),
      nome: `Macrofluxo Padrão ${macrofluxos.length + 1}`,
      descricao: "Sequência construtiva padrão compartilhada no banco",
      atividadesPadrao: [],
    };
    if (onSalvarMacrofluxo) {
      try {
        await onSalvarMacrofluxo(novo);
      } catch (e) {
        console.warn("Erro ao salvar novo macrofluxo:", e);
      }
    }
    setProj?.((p) => ({ ...p, macrofluxos: [...(p.macrofluxos || []), novo] }));
    setSelMacroId(novo.id);
  };

  const carregarModeloPadrao = async () => {
    const modelos = getModelosPadraoMacrofluxo();
    for (const m of modelos) {
      if (onSalvarMacrofluxo) {
        try {
          await onSalvarMacrofluxo(m);
        } catch (e) {
          console.warn("Erro ao salvar modelo padrão:", e);
        }
      }
    }
    setProj?.((p) => ({
      ...p,
      macrofluxos: [...(p.macrofluxos || []), ...modelos],
    }));
    setSelMacroId(modelos[0].id);
  };

  const excluirMacrofluxo = async (id) => {
    if (onExcluirMacrofluxo) {
      await onExcluirMacrofluxo(id);
    }
    setProj?.((p) => ({ ...p, macrofluxos: (p.macrofluxos || []).filter((m) => m.id !== id) }));
    if (selMacroId === id) {
      const restantes = macrofluxos.filter((m) => m.id !== id);
      setSelMacroId(restantes[0]?.id || null);
    }
  };

  const pedirExcluirMacrofluxo = (m) => {
    setModalConfirmacao({
      titulo: "Excluir Macrofluxo",
      mensagem: "Tem certeza que deseja excluir este modelo de macrofluxo do banco de dados? Ele será removido da biblioteca global de obras.",
      itemNome: m.nome,
      textoBotao: "Excluir Macrofluxo",
      onConfirmar: () => {
        excluirMacrofluxo(m.id);
        setModalConfirmacao(null);
      },
    });
  };

  const atualizarMacrofluxo = (id, obj) => {
    const macroAtual = macrofluxos.find((m) => m.id === id);
    if (!macroAtual) return;
    const atualizado = { ...macroAtual, ...obj };

    setProj?.((p) => ({
      ...p,
      macrofluxos: (p.macrofluxos || []).map((m) => (m.id === id ? atualizado : m)),
    }));

    debouncedSave(atualizado);
  };

  const novaAtividadePadrao = () => {
    if (!selMacro) return;
    const anterior = selMacro.atividadesPadrao[selMacro.atividadesPadrao.length - 1];
    const nova = {
      id: uid(),
      nome: `Nova Atividade ${selMacro.atividadesPadrao.length + 1}`,
      cor: BLACK,
      modo: "LINHA",
      ritmoMesPadrao: 4, // pavs por mes
      duracaoBloco: 30, // dias se for BLOCO
      predecessoraId: anterior ? anterior.id : null,
      defasagemDias: anterior ? 14 : 0,
    };
    atualizarMacrofluxo(selMacro.id, {
      atividadesPadrao: [...selMacro.atividadesPadrao, nova],
    });
  };

  const atualizarAtiv = (aId, obj) => {
    if (!selMacro) return;
    const atualizadas = selMacro.atividadesPadrao.map((a) =>
      a.id === aId ? { ...a, ...obj } : a
    );
    atualizarMacrofluxo(selMacro.id, { atividadesPadrao: atualizadas });
  };

  const excluirAtiv = (aId) => {
    if (!selMacro) return;
    const atualizadas = selMacro.atividadesPadrao
      .filter((a) => a.id !== aId)
      .map((a) =>
        a.predecessoraId === aId
          ? { ...a, predecessoraId: null, defasagemDias: 0 }
          : a
      );
    atualizarMacrofluxo(selMacro.id, { atividadesPadrao: atualizadas });
  };

  const pedirExcluirAtiv = (a) => {
    setModalConfirmacao({
      titulo: "Excluir Atividade Padrão",
      mensagem: "Deseja remover esta atividade da sequência padrão do macrofluxo?",
      itemNome: a.nome,
      textoBotao: "Excluir Atividade",
      onConfirmar: () => {
        excluirAtiv(a.id);
        setModalConfirmacao(null);
      },
    });
  };

  const moverAtiv = (index, direcao) => {
    if (!selMacro) return;
    const novoIdx = index + direcao;
    if (novoIdx < 0 || novoIdx >= selMacro.atividadesPadrao.length) return;
    const lista = [...selMacro.atividadesPadrao];
    const [item] = lista.splice(index, 1);
    lista.splice(novoIdx, 0, item);
    atualizarMacrofluxo(selMacro.id, { atividadesPadrao: lista });
  };

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: T.bg }}>
      {/* ── Barra Lateral de Macrofluxos ── */}
      <div
        className="w-72 shrink-0 flex flex-col border-r shadow-xs"
        style={{ background: T.panel, borderColor: T.line }}
      >
        <div
          className="p-3 border-b flex items-center justify-between"
          style={{ borderColor: T.line }}
        >
          <button
            onClick={onVoltar}
            className="p-1.5 rounded transition-colors hover:bg-black/5 flex items-center gap-1 text-xs font-semibold"
            title="Voltar ao Gráfico"
            style={{ color: T.muted }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="text-center">
            <span className="font-bold text-sm block" style={{ color: T.text }}>
              Macrofluxos
            </span>
            <span className="text-[10px] flex items-center justify-center gap-1 text-emerald-600 font-medium">
              <Database size={10} /> Biblioteca Global
            </span>
          </div>
          <button
            onClick={novoMacrofluxo}
            className="p-1.5 rounded transition-all hover:brightness-110 active:scale-95 flex items-center justify-center text-white shadow-xs"
            style={{ background: ORANGE }}
            title="Criar novo macrofluxo global"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Botão de carregar modelo se estiver vazio */}
        {macrofluxos.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-xs mb-3" style={{ color: T.dim }}>
              Você ainda não cadastrou nenhum macrofluxo.
            </p>
            <button
              onClick={carregarModeloPadrao}
              className="w-full py-2 px-3 text-xs font-bold rounded text-white flex items-center justify-center gap-1.5 transition-all hover:brightness-110 shadow"
              style={{ background: ORANGE }}
            >
              <Sparkles size={13} /> Carregar Modelo Padrão
            </button>
          </div>
        )}

        {/* Lista de Macrofluxos */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {macrofluxos.map((m) => {
            const isSelected = selMacroId === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelMacroId(m.id)}
                className="group flex items-center justify-between p-2.5 rounded cursor-pointer transition-colors"
                style={{
                  background: isSelected ? T.raised : "transparent",
                  borderLeft: `3px solid ${isSelected ? ORANGE : "transparent"}`,
                }}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div
                    className="text-xs font-bold truncate"
                    style={{ color: isSelected ? ORANGE : T.text }}
                  >
                    {m.nome}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: T.dim }}>
                    {m.atividadesPadrao?.length || 0} atividade(s)
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    pedirExcluirMacrofluxo(m);
                  }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                  style={{ color: T.dim }}
                  title="Excluir macrofluxo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {macrofluxos.length > 0 && (
          <div className="p-3 border-t" style={{ borderColor: T.line }}>
            <button
              onClick={carregarModeloPadrao}
              className="w-full py-1.5 px-2 text-[11px] font-medium rounded flex items-center justify-center gap-1.5 transition-colors hover:bg-black/5"
              style={{ color: T.muted, border: `1px dashed ${T.line}` }}
            >
              <Sparkles size={12} /> Inserir Modelo Padrão
            </button>
          </div>
        )}
      </div>

      {/* ── Painel de Detalhes e Edição ── */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6">
        {selMacro ? (
          <div className="max-w-4xl w-full mx-auto space-y-6">
            {/* Header do Macrofluxo Selecionado */}
            <div
              className="p-5 rounded-lg shadow-sm border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              style={{ background: T.panel, borderColor: T.line }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                    <Database size={10} /> Salvo no Banco de Dados
                  </span>
                  <span className="text-[11px]" style={{ color: T.dim }}>
                    {salvando ? (
                      <span className="text-amber-500 flex items-center gap-1">
                        <RefreshCw size={11} className="animate-spin" /> Salvando alterações...
                      </span>
                    ) : ultimoSalvo ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Check size={11} /> Atualizado às {ultimoSalvo}
                      </span>
                    ) : (
                      <span>Disponível para qualquer obra</span>
                    )}
                  </span>
                </div>
                <input
                  value={selMacro.nome}
                  onChange={(e) =>
                    atualizarMacrofluxo(selMacro.id, { nome: e.target.value })
                  }
                  className="text-lg font-bold bg-transparent outline-none w-full border-b border-transparent focus:border-orange-500 pb-0.5"
                  style={{ color: T.text }}
                  placeholder="Nome do Macrofluxo / Padrão Construtivo"
                />
                <input
                  value={selMacro.descricao || ""}
                  onChange={(e) =>
                    atualizarMacrofluxo(selMacro.id, { descricao: e.target.value })
                  }
                  className="text-xs bg-transparent outline-none w-full mt-1.5"
                  style={{ color: T.dim }}
                  placeholder="Descrição ou observações deste padrão de fluxo..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleSalvarManual}
                  disabled={salvando}
                  className="px-3.5 py-2 text-xs font-semibold rounded flex items-center gap-1.5 transition-all border hover:bg-black/5 active:scale-95"
                  style={{ borderColor: T.line, color: T.text, background: T.raised }}
                  title="Salvar alterações imediatamente no banco de dados"
                >
                  {salvando ? <RefreshCw size={13} className="animate-spin text-amber-500" /> : <Save size={13} className="text-emerald-500" />}
                  <span>{salvando ? "Salvando..." : "Salvar no Banco"}</span>
                </button>
                <button
                  onClick={() => onAplicarTorre && onAplicarTorre(selMacro.id)}
                  className="px-4 py-2 text-xs font-bold rounded flex items-center gap-1.5 text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: ORANGE }}
                  title="Gerar as atividades deste macrofluxo em uma torre da obra"
                >
                  <Zap size={14} /> Aplicar na Obra / Torre
                </button>
                <button
                  onClick={novaAtividadePadrao}
                  className="px-3 py-2 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors border hover:bg-black/5"
                  style={{ borderColor: T.line, color: T.text, background: T.raised }}
                >
                  <Plus size={14} /> Nova Atividade
                </button>
              </div>
            </div>

            {/* Auditoria de Incoerências de Predecessoras */}
            {incoerencias.length > 0 ? (
              <div
                className="p-4 rounded-lg border flex flex-col gap-3 shadow-sm transition-all"
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  borderColor: "rgba(239, 68, 68, 0.35)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="text-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                      Incoerência no Cronograma da Obra ({incoerencias.length} {incoerencias.length === 1 ? "apontamento" : "apontamentos"})
                    </span>
                  </div>
                  <span className="text-[11px] text-red-500 font-medium">
                    Atividades planejadas antes de suas predecessoras
                  </span>
                </div>

                <div className="space-y-2">
                  {incoerencias.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3 rounded bg-white/70 dark:bg-black/30 border border-red-200 dark:border-red-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-bold" style={{ color: T.text }}>
                          <span className="text-red-600 font-black">⚠️ {inc.atividadeNome}</span>
                          <span className="text-gray-400">depende de</span>
                          <span className="text-blue-600 font-semibold">{inc.predecessoraNome}</span>
                        </div>
                        <p className="text-[11px] text-red-600 mt-1">
                          {inc.mensagem} (Início planejado: <strong>{fmtBR(inc.dataIni)}</strong> | Predecessora inicia: <strong>{fmtBR(inc.predecessoraDataIni)}</strong>)
                        </p>
                      </div>

                      <button
                        onClick={() => handleCorrigirIncoerencia(inc.atividadeId)}
                        className="px-2.5 py-1.5 rounded text-[11px] font-bold text-white flex items-center gap-1.5 transition-all hover:brightness-110 active:scale-95 shadow-xs shrink-0"
                        style={{ background: "#EF4444" }}
                        title="Ajustar automaticamente a data de início para respeitar a predecessora"
                      >
                        <RefreshCw size={12} />
                        Corrigir no Gráfico
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="p-3 rounded-lg border flex items-center gap-2.5 text-xs font-medium"
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  borderColor: "rgba(16, 185, 129, 0.25)",
                  color: "#10B981",
                }}
              >
                <CheckCircle2 size={16} />
                <span>Nenhuma incoerência de predecessoras detectada no cronograma da obra. Todas as dependências estão respeitadas.</span>
              </div>
            )}

            {/* Lista de Atividades Padrão */}
            <div className="space-y-3">
              {selMacro.atividadesPadrao.length === 0 ? (
                <div
                  className="p-12 text-center rounded-lg border border-dashed flex flex-col items-center justify-center"
                  style={{ borderColor: T.line, color: T.dim }}
                >
                  <Layers size={36} className="mb-2 opacity-40" />
                  <p className="font-semibold text-sm">
                    Nenhuma atividade configurada neste macrofluxo
                  </p>
                  <p className="text-xs mt-1 mb-4">
                    Adicione atividades sequenciais com seus respectivos ritmos e dependências.
                  </p>
                  <button
                    onClick={novaAtividadePadrao}
                    className="px-3.5 py-1.5 text-xs font-bold rounded text-white flex items-center gap-1.5 shadow"
                    style={{ background: ORANGE }}
                  >
                    <Plus size={14} /> Adicionar Primeira Atividade
                  </button>
                </div>
              ) : (
                selMacro.atividadesPadrao.map((a, i) => {
                  const diasPorPav =
                    a.modo === "LINHA" && a.ritmoMesPadrao > 0
                      ? (30 / a.ritmoMesPadrao).toFixed(1)
                      : null;

                  return (
                    <div
                      key={a.id}
                      className="p-4 rounded-lg shadow-sm border space-y-3 transition-shadow hover:shadow-md"
                      style={{ background: T.panel, borderColor: T.line }}
                    >
                      {/* Linha Superior: Ordem, Nome, Cor, Reordenar, Excluir */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0 shadow-xs"
                          style={{ background: a.cor || BLACK }}
                        >
                          {i + 1}
                        </div>

                        <input
                          value={a.nome}
                          onChange={(e) => atualizarAtiv(a.id, { nome: e.target.value })}
                          className="text-sm font-bold bg-transparent outline-none flex-1 border-b border-transparent focus:border-orange-500 pb-0.5"
                          style={{ color: T.text }}
                          placeholder="Nome da Atividade"
                        />

                        <input
                          type="color"
                          value={a.cor || BLACK}
                          onChange={(e) => atualizarAtiv(a.id, { cor: e.target.value })}
                          className="w-7 h-7 p-0 border-0 rounded cursor-pointer shrink-0"
                          title="Definir cor da atividade"
                        />

                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => moverAtiv(i, -1)}
                            disabled={i === 0}
                            className="p-1 rounded hover:bg-black/5 disabled:opacity-20"
                            style={{ color: T.muted }}
                            title="Mover para cima"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => moverAtiv(i, 1)}
                            disabled={i === selMacro.atividadesPadrao.length - 1}
                            className="p-1 rounded hover:bg-black/5 disabled:opacity-20"
                            style={{ color: T.muted }}
                            title="Mover para baixo"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => pedirExcluirAtiv(a)}
                          className="p-1.5 hover:bg-red-500/10 rounded text-red-500 transition-colors"
                          title="Excluir atividade padrão"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Grade de Parâmetros de Produção */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-9 pt-1">
                        {/* Modo de Execução */}
                        <div>
                          <label
                            className="block text-[11px] font-semibold mb-1"
                            style={{ color: T.dim }}
                          >
                            Modo de Execução
                          </label>
                          <select
                            value={a.modo}
                            onChange={(e) =>
                              atualizarAtiv(a.id, { modo: e.target.value })
                            }
                            className="w-full text-xs p-1.5 outline-none rounded border"
                            style={{
                              background: T.input,
                              borderColor: T.line,
                              color: T.text,
                            }}
                          >
                            <option value="LINHA">Linha (Contínua / Pavimento a Pavimento)</option>
                            <option value="BLOCO">Bloco (Isolada / Duração Fixa)</option>
                          </select>
                        </div>

                        {/* Ritmo / Duração */}
                        {a.modo === "LINHA" ? (
                          <div>
                            <label
                              className="block text-[11px] font-semibold mb-1 flex items-center justify-between"
                              style={{ color: T.dim }}
                            >
                              <span className="flex items-center gap-1">
                                <Gauge size={11} /> Ritmo (Pav/mês)
                              </span>
                              {diasPorPav && (
                                <span className="font-normal text-[10px]" style={{ color: ORANGE }}>
                                  ≈ {diasPorPav} d/pav
                                </span>
                              )}
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0.1"
                              value={a.ritmoMesPadrao ?? 4}
                              onChange={(e) =>
                                atualizarAtiv(a.id, {
                                  ritmoMesPadrao: parseFloat(e.target.value) || 1,
                                })
                              }
                              className="w-full text-xs p-1.5 outline-none rounded border"
                              style={{
                                ...NUM,
                                background: T.input,
                                borderColor: T.line,
                                color: T.text,
                              }}
                            />
                          </div>
                        ) : (
                          <div>
                            <label
                              className="block text-[11px] font-semibold mb-1 flex items-center gap-1"
                              style={{ color: T.dim }}
                            >
                              <Clock size={11} /> Duração Fixa (Dias)
                            </label>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={a.duracaoBloco ?? 30}
                              onChange={(e) =>
                                atualizarAtiv(a.id, {
                                  duracaoBloco: parseInt(e.target.value, 10) || 1,
                                })
                              }
                              className="w-full text-xs p-1.5 outline-none rounded border"
                              style={{
                                ...NUM,
                                background: T.input,
                                borderColor: T.line,
                                color: T.text,
                              }}
                            />
                          </div>
                        )}

                        {/* Predecessora e Defasagem */}
                        <div>
                          <label
                            className="block text-[11px] font-semibold mb-1 flex items-center gap-1"
                            style={{ color: T.dim }}
                          >
                            <LinkIcon size={11} /> Predecessora (Início-a-Início)
                          </label>
                          <select
                            value={a.predecessoraId || ""}
                            onChange={(e) =>
                              atualizarAtiv(a.id, {
                                predecessoraId: e.target.value || null,
                              })
                            }
                            className="w-full text-xs p-1.5 outline-none rounded border"
                            style={{
                              background: T.input,
                              borderColor: T.line,
                              color: T.text,
                            }}
                          >
                            <option value="">Nenhuma (Início do Marco/Obra)</option>
                            {selMacro.atividadesPadrao
                              .filter((cand) => cand.id !== a.id)
                              .map((cand) => (
                                <option key={cand.id} value={cand.id}>
                                  {cand.nome}
                                </option>
                              ))}
                          </select>

                          {a.predecessoraId && (
                            <div
                              className="flex items-center gap-1.5 mt-1.5 text-[11px]"
                              style={{ color: T.muted }}
                            >
                              <span>Defasagem:</span>
                              <input
                                type="number"
                                value={a.defasagemDias ?? 0}
                                onChange={(e) =>
                                  atualizarAtiv(a.id, {
                                    defasagemDias:
                                      parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                className="w-14 p-0.5 outline-none rounded border text-center font-bold"
                                style={{
                                  ...NUM,
                                  background: T.input,
                                  borderColor: T.line,
                                  color: T.text,
                                }}
                              />
                              <span>dias do início</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center text-center p-8"
            style={{ color: T.dim }}
          >
            <Settings2 size={48} className="mb-4 opacity-40" />
            <h3 className="text-base font-bold mb-1" style={{ color: T.text }}>
              Selecione ou crie um Macrofluxo
            </h3>
            <p className="text-xs max-w-sm mb-4">
              Defina padrões construtivos que podem ser aplicados em qualquer torre para gerar instantaneamente a Linha de Balanço.
            </p>
            <button
              onClick={carregarModeloPadrao}
              className="px-4 py-2 text-xs font-bold rounded text-white flex items-center gap-1.5 shadow"
              style={{ background: ORANGE }}
            >
              <Sparkles size={14} /> Carregar Macrofluxo Residencial
            </button>
          </div>
        )}
      </div>

      {modalConfirmacao && (
        <ModalConfirmarExclusao
          T={T}
          titulo={modalConfirmacao.titulo}
          mensagem={modalConfirmacao.mensagem}
          itemNome={modalConfirmacao.itemNome}
          textoBotao={modalConfirmacao.textoBotao}
          onConfirmar={modalConfirmacao.onConfirmar}
          onCancelar={() => setModalConfirmacao(null)}
        />
      )}
    </div>
  );
};
