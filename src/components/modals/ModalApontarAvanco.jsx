// src/components/modals/ModalApontarAvanco.jsx
import React, { useState, useMemo } from "react";
import {
  X,
  TrendingUp,
  Users,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HardHat,
  FileText,
} from "lucide-react";
import { ORANGE, OK, ERRO, NUM, FONT } from "../../constants/theme";
import { D, iso, hoje, fmtBR } from "../../utils/dateUtils";
import { CARGOS_PADRAO, getCargoCor } from "../../constants/cargos";

export const ModalApontarAvanco = ({
  T,
  isOpen,
  onClose,
  atividade,
  proj,
  onSalvar,
  user,
}) => {
  if (!isOpen || !atividade) return null;

  const torre = proj?.torres?.find((t) => t.id === atividade.torreId);
  const locaisTorre = useMemo(() => {
    return (proj?.locais || [])
      .filter((l) => l.torreId === atividade.torreId)
      .sort((a, b) => a.ordem - b.ordem);
  }, [proj, atividade.torreId]);

  const avancoAtual = Number(atividade.avanco) || 0;

  // Estados do formulário
  const [dataApontamento, setDataApontamento] = useState(() => iso(hoje()));
  const [percentualNovo, setPercentualNovo] = useState(() => {
    if (avancoAtual >= 100) return 100;
    return Math.min(100, avancoAtual + 10);
  });
  const [pavimentoId, setPavimentoId] = useState(
    atividade.pavimentoAtualId || locaisTorre[0]?.id || ""
  );

  // Lista de cargos e homens
  const [equipe, setEquipe] = useState([
    { id: "cargo_1", cargo: "Pedreiro", outroNome: "", quantidade: 2 },
    { id: "cargo_2", cargo: "Servente / Ajudante", outroNome: "", quantidade: 2 },
  ]);

  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Pavimento selecionado
  const pavimentoSelecionado = locaisTorre.find((l) => l.id === pavimentoId);

  // Delta de avanço
  const delta = Math.max(0, percentualNovo - avancoAtual);

  // Total de homens
  const totalHomens = useMemo(() => {
    return equipe.reduce((acc, curr) => acc + (Math.max(1, parseInt(curr.quantidade, 10) || 1)), 0);
  }, [equipe]);

  // Manipulação de equipe
  const adicionarCargo = () => {
    setEquipe((prev) => [
      ...prev,
      {
        id: "cargo_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        cargo: "Pedreiro",
        outroNome: "",
        quantidade: 1,
      },
    ]);
  };

  const atualizarCargo = (id, campo, valor) => {
    setEquipe((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const removerCargo = (id) => {
    if (equipe.length <= 1) return;
    setEquipe((prev) => prev.filter((item) => item.id !== id));
  };

  // Submissão do apontamento
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (salvando) return;

    // Normalizar cargos
    const cargosFormatados = equipe.map((item) => {
      const nomeFinal =
        item.cargo === "outro" || item.cargo === "Outro"
          ? (item.outroNome?.trim() || "Outro")
          : item.cargo;
      return {
        cargo: nomeFinal,
        quantidade: Math.max(1, parseInt(item.quantidade, 10) || 1),
        cor: getCargoCor(nomeFinal),
      };
    });

    const apontamentoData = {
      id: "apont_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      data: dataApontamento,
      avancoAnterior: avancoAtual,
      avancoNovo: percentualNovo,
      deltaAvanco: delta,
      pavimentoId: pavimentoId || null,
      pavimentoNome: pavimentoSelecionado?.nome || "",
      homensTotal: totalHomens,
      cargos: cargosFormatados,
      observacao: observacao.trim(),
      userNome: user?.user_metadata?.nome || user?.nome || user?.email?.split("@")[0] || "Usuário",
      userId: user?.id || null,
      createdAt: new Date().toISOString(),
    };

    setSalvando(true);
    try {
      await onSalvar(atividade.id, percentualNovo, apontamentoData);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar apontamento:", err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]"
        style={{
          background: T.panel,
          borderColor: T.line,
          color: T.text,
          fontFamily: FONT,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Topo do Modal ── */}
        <div
          className="p-4 sm:p-5 border-b flex items-start justify-between gap-3 shrink-0"
          style={{
            borderColor: T.line,
            background: "linear-gradient(180deg, rgba(254, 80, 0, 0.08) 0%, transparent 100%)",
          }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-md"
              style={{
                background: "linear-gradient(135deg, #FE5000 0%, #E04600 100%)",
              }}
            >
              <HardHat size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full"
                  style={{ background: `${ORANGE}22`, color: ORANGE }}
                >
                  Novo Apontamento de Avanço
                </span>
                {torre?.nome && (
                  <span
                    className="text-[10.5px] font-semibold flex items-center gap-1"
                    style={{ color: T.muted }}
                  >
                    <Building2 size={12} /> {torre.nome}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold truncate mt-0.5" style={{ color: T.text }}>
                {atividade.nome}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Corpo com Rolagem Suave ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Linha 1: Data e Pavimento Atual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Data da Medição */}
            <div className="p-3 rounded-xl border" style={{ background: T.raised, borderColor: T.line }}>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5" style={{ color: T.dim }}>
                <Calendar size={13} style={{ color: ORANGE }} /> Data da Medição / Avanço
              </label>
              <input
                type="date"
                required
                value={dataApontamento}
                onChange={(e) => setDataApontamento(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg outline-none font-semibold border transition-all"
                style={{
                  ...NUM,
                  background: T.input,
                  borderColor: T.line,
                  color: T.text,
                  colorScheme: T.scheme,
                }}
              />
            </div>

            {/* Pavimento / Frente */}
            <div className="p-3 rounded-xl border" style={{ background: T.raised, borderColor: T.line }}>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5" style={{ color: T.dim }}>
                <Layers size={13} style={{ color: OK }} /> Pavimento / Frente de Trabalho
              </label>
              <select
                value={pavimentoId}
                onChange={(e) => setPavimentoId(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg outline-none font-medium border transition-all cursor-pointer"
                style={{
                  background: T.input,
                  borderColor: T.line,
                  color: T.text,
                }}
              >
                <option value="">Frente Geral da Torre</option>
                {locaisTorre.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Percentual de Avanço Realizado */}
          <div className="p-4 rounded-xl border space-y-3" style={{ background: T.raised, borderColor: T.line }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: T.dim }}>
                <TrendingUp size={14} style={{ color: OK }} /> Percentual Físico Concluído
              </span>

              {/* Comparador Visual */}
              <div className="flex items-center gap-2 text-xs font-bold" style={{ ...NUM }}>
                <span className="px-2 py-0.5 rounded-md" style={{ background: T.panel, color: T.muted }}>
                  Anterior: {avancoAtual}%
                </span>
                <ArrowRight size={13} style={{ color: ORANGE }} />
                <span
                  className="px-2.5 py-0.5 rounded-md text-white shadow-xs"
                  style={{ background: percentualNovo === 100 ? OK : ORANGE }}
                >
                  Novo: {percentualNovo}%
                </span>
                {delta > 0 && (
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    (+{delta}%)
                  </span>
                )}
              </div>
            </div>

            {/* Slider de Precisão */}
            <div className="pt-1">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={percentualNovo}
                onChange={(e) => setPercentualNovo(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500"
                style={{
                  background: `linear-gradient(to right, ${OK} 0%, ${OK} ${percentualNovo}%, ${T.line} ${percentualNovo}%, ${T.line} 100%)`,
                }}
              />
            </div>

            {/* Botões Rápidos de Ajuste */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] uppercase font-bold mr-1" style={{ color: T.dim }}>
                Atalhos:
              </span>
              {[
                { label: "+5%", add: 5 },
                { label: "+10%", add: 10 },
                { label: "+20%", add: 20 },
                { label: "+25%", add: 25 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => setPercentualNovo((prev) => Math.min(100, prev + btn.add))}
                  className="text-xs px-2.5 py-1 rounded-lg border font-bold hover:brightness-110 transition-all cursor-pointer"
                  style={{
                    background: T.panel,
                    borderColor: T.line,
                    color: T.text,
                    ...NUM,
                  }}
                >
                  {btn.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPercentualNovo(100)}
                className="text-xs px-3 py-1 rounded-lg font-bold text-white transition-all hover:brightness-110 ml-auto cursor-pointer"
                style={{ background: OK }}
              >
                100% Concluída
              </button>
            </div>
          </div>

          {/* Linha 3: Mão de Obra e Cargos (Alimentador Principal do Histograma) */}
          <div className="p-4 rounded-xl border space-y-3" style={{ background: T.raised, borderColor: T.line }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: T.dim }}>
                  <Users size={14} style={{ color: ORANGE }} /> Mão de Obra Empregada no Avanço
                </span>
                <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>
                  Indique a quantidade de trabalhadores e cargos utilizados para alimentar o Histograma da torre.
                </p>
              </div>

              {/* Totalizador de Homens */}
              <div
                className="px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-xs"
                style={{
                  background: "linear-gradient(135deg, rgba(254, 80, 0, 0.15) 0%, rgba(254, 80, 0, 0.05) 100%)",
                  borderColor: "rgba(254, 80, 0, 0.3)",
                }}
              >
                <Users size={15} style={{ color: ORANGE }} />
                <span className="text-xs font-bold" style={{ color: T.text }}>
                  Total: <span className="text-sm font-black" style={{ ...NUM, color: ORANGE }}>{totalHomens}</span> homens
                </span>
              </div>
            </div>

            {/* Linhas Dinâmicas de Cargos */}
            <div className="space-y-2 pt-1">
              {equipe.map((item, index) => {
                const corCargo = getCargoCor(item.cargo === "outro" ? item.outroNome : item.cargo);

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border flex items-center gap-2 flex-wrap sm:flex-nowrap transition-all"
                    style={{ background: T.panel, borderColor: T.line }}
                  >
                    {/* Indicador de Cor */}
                    <div
                      className="w-2.5 h-8 rounded-full shrink-0"
                      style={{ background: corCargo }}
                    />

                    {/* Cargo Select */}
                    <div className="flex-1 min-w-[170px]">
                      <select
                        value={item.cargo}
                        onChange={(e) => atualizarCargo(item.id, "cargo", e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none font-semibold border cursor-pointer"
                        style={{
                          background: T.input,
                          borderColor: T.line,
                          color: T.text,
                        }}
                      >
                        {CARGOS_PADRAO.map((c) => (
                          <option key={c.id} value={c.nome}>
                            {c.nome} ({c.categoria})
                          </option>
                        ))}
                        <option value="outro">Outro cargo personalizado...</option>
                      </select>
                    </div>

                    {/* Campo de nome caso escolha 'outro' */}
                    {item.cargo === "outro" && (
                      <div className="flex-1 min-w-[140px]">
                        <input
                          type="text"
                          placeholder="Digite o cargo..."
                          value={item.outroNome}
                          onChange={(e) => atualizarCargo(item.id, "outroNome", e.target.value)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg outline-none border font-medium"
                          style={{
                            background: T.input,
                            borderColor: T.line,
                            color: T.text,
                          }}
                        />
                      </div>
                    )}

                    {/* Quantidade de Homens */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-bold" style={{ color: T.dim }}>
                        Qtd:
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        required
                        value={item.quantidade}
                        onChange={(e) =>
                          atualizarCargo(item.id, "quantidade", Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                        className="w-16 text-xs px-2 py-1.5 rounded-lg outline-none text-center font-bold border"
                        style={{
                          ...NUM,
                          background: T.input,
                          borderColor: T.line,
                          color: T.text,
                        }}
                      />
                      <span className="text-[10px]" style={{ color: T.muted }}>
                        homens
                      </span>
                    </div>

                    {/* Remover Cargo */}
                    <button
                      type="button"
                      onClick={() => removerCargo(item.id)}
                      disabled={equipe.length <= 1}
                      className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Remover cargo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Botão Adicionar Cargo */}
            <button
              type="button"
              onClick={adicionarCargo}
              className="text-xs px-3 py-1.5 rounded-xl border border-dashed flex items-center gap-1.5 font-semibold hover:border-orange-500 hover:text-orange-500 transition-all cursor-pointer"
              style={{
                borderColor: T.line,
                color: T.muted,
                background: "transparent",
              }}
            >
              <Plus size={13} /> Adicionar Outro Cargo à Equipe
            </button>
          </div>

          {/* Linha 4: Observações Opcionais */}
          <div className="p-3 rounded-xl border" style={{ background: T.raised, borderColor: T.line }}>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5" style={{ color: T.dim }}>
              <FileText size={13} style={{ color: T.dim }} /> Observações do Apontamento (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Trecho concluído conforme projeto estrutural. Equipe dobrou turno."
              className="w-full text-xs p-2.5 rounded-lg outline-none border transition-all resize-none"
              style={{
                background: T.input,
                borderColor: T.line,
                color: T.text,
              }}
            />
          </div>
        </form>

        {/* ── Rodapé de Ações ── */}
        <div
          className="p-3 sm:p-4 border-t flex items-center justify-between gap-2 shrink-0"
          style={{ background: T.panel, borderColor: T.line }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="text-xs px-4 py-2 rounded-xl border font-semibold hover:bg-white/5 transition-all cursor-pointer"
            style={{ borderColor: T.line, color: T.muted }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={salvando}
            className="text-xs px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #FE5000 0%, #E04600 100%)",
              boxShadow: "0 4px 14px rgba(254, 80, 0, 0.35)",
            }}
          >
            <CheckCircle2 size={15} />
            <span>{salvando ? "Gravando no Supabase..." : "Gravar Avanço & Histograma"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
