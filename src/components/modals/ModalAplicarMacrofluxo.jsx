import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { ORANGE, NUM, BLACK } from "../../constants/theme";
import { Zap, Sparkles, Building2, Calendar, Layers, RefreshCw } from "lucide-react";
import { getModelosPadraoMacrofluxo } from "../../utils/macrofluxoUtils";

export const ModalAplicarMacrofluxo = ({
  T,
  proj,
  setProj,
  torreId: torreIdInicial,
  macroIdInicial,
  onClose,
  onAplicar,
}) => {
  const macros = proj.macrofluxos || [];
  const [macroId, setMacroId] = useState(macroIdInicial || macros[0]?.id || "");
  const [torreId, setTorreId] = useState(torreIdInicial || proj.torres?.[0]?.id || "TODAS");
  const [dataInicioStr, setDataInicioStr] = useState(proj.dataZero || new Date().toISOString().slice(0, 10));
  const [substituir, setSubstituir] = useState(true);

  const selMacro = macros.find((m) => m.id === macroId);
  const torreSelecionada = proj.torres.find((t) => t.id === torreId);

  const handleCarregarModeloPadrao = () => {
    const modelos = getModelosPadraoMacrofluxo();
    setProj((p) => ({
      ...p,
      macrofluxos: [...(p.macrofluxos || []), ...modelos],
    }));
    setMacroId(modelos[0].id);
  };

  const handleAplicar = () => {
    if (!macroId) return alert("Selecione um macrofluxo");
    if (!dataInicioStr) return alert("Informe a data de início");

    onAplicar({
      macrofluxoId: macroId,
      torreId,
      dataInicio: dataInicioStr,
      substituirExistentes: substituir,
    });
  };

  return (
    <Modal
      T={T}
      titulo="Gerar Cronograma via Macrofluxo"
      onClose={onClose}
    >
      <div className="space-y-4">
        {macros.length === 0 ? (
          <div
            className="p-4 rounded border text-center space-y-3"
            style={{ background: T.raised, borderColor: T.line }}
          >
            <Sparkles size={28} className="mx-auto text-amber-500" />
            <div>
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                Nenhum Macrofluxo cadastrado no projeto
              </p>
              <p className="text-xs mt-1" style={{ color: T.dim }}>
                Deseja carregar o modelo padrão residencial (Estrutura, Instalações, Acabamentos)?
              </p>
            </div>
            <button
              onClick={handleCarregarModeloPadrao}
              className="px-4 py-2 text-xs font-bold rounded text-white flex items-center justify-center gap-1.5 mx-auto transition-transform active:scale-95 shadow"
              style={{ background: ORANGE }}
            >
              <Zap size={14} /> Carregar Macrofluxo Padrão
            </button>
          </div>
        ) : (
          <>
            {/* Seleção de Torre */}
            <div>
              <label className="block text-xs font-bold mb-1.5 flex items-center gap-1" style={{ color: T.text }}>
                <Building2 size={13} /> Torre de Destino
              </label>
              <select
                value={torreId}
                onChange={(e) => setTorreId(e.target.value)}
                className="w-full text-xs p-2 outline-none rounded border"
                style={{ background: T.input, borderColor: T.line, color: T.text }}
              >
                <option value="TODAS">Todas as Torres ({proj.torres.length})</option>
                {proj.torres.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Seleção de Macrofluxo */}
            <div>
              <label className="block text-xs font-bold mb-1.5 flex items-center gap-1" style={{ color: T.text }}>
                <Layers size={13} /> Padrão Construtivo (Macrofluxo)
              </label>
              <select
                value={macroId}
                onChange={(e) => setMacroId(e.target.value)}
                className="w-full text-xs p-2 outline-none rounded border"
                style={{ background: T.input, borderColor: T.line, color: T.text }}
              >
                <option value="">Selecione um macrofluxo...</option>
                {macros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.atividadesPadrao?.length || 0} atividades)
                  </option>
                ))}
              </select>

              {selMacro && (
                <div
                  className="mt-2 p-2.5 rounded border text-xs space-y-1.5 max-h-36 overflow-y-auto"
                  style={{ background: T.raised, borderColor: T.line }}
                >
                  <span className="font-semibold block" style={{ color: T.text }}>
                    Sequência de Atividades ({selMacro.atividadesPadrao.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selMacro.atividadesPadrao.map((a, i) => (
                      <span
                        key={a.id}
                        className="px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 shadow-xs"
                        style={{
                          background: a.cor || BLACK,
                          color: "#fff",
                        }}
                      >
                        <span>{i + 1}.</span> {a.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Data de Início */}
            <div>
              <label className="block text-xs font-bold mb-1.5 flex items-center gap-1" style={{ color: T.text }}>
                <Calendar size={13} /> Data de Início da 1ª Atividade
              </label>
              <input
                type="date"
                value={dataInicioStr}
                onChange={(e) => setDataInicioStr(e.target.value)}
                className="w-full text-xs p-2 outline-none rounded border"
                style={{ ...NUM, background: T.input, borderColor: T.line, color: T.text }}
              />
            </div>

            {/* Opção de Substituição */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: T.text }}>
                <input
                  type="checkbox"
                  checked={substituir}
                  onChange={(e) => setSubstituir(e.target.checked)}
                  className="rounded"
                />
                <span>Substituir atividades existentes na(s) torre(s) selecionada(s)</span>
              </label>
            </div>

            {/* Botão de Ação */}
            <button
              onClick={handleAplicar}
              className="w-full py-2.5 rounded text-xs font-bold mt-3 transition-all hover:brightness-110 flex items-center justify-center gap-2 text-white shadow-md active:scale-98"
              style={{ background: ORANGE }}
            >
              <Zap size={14} /> Gerar Linha de Balanço / Cronograma
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
