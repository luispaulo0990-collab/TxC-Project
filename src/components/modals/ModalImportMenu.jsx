import React from "react";
import { Layers, TrendingUp, RefreshCw, Download, FileSpreadsheet } from "lucide-react";
import { Modal } from "../common/Modal";
import { ORANGE, OK } from "../../constants/theme";

export const ModalImportMenu = ({ T, torreNome, onClose, onSelectTipo, onBaixarModelo }) => {
  const opcoes = [
    {
      k: "plan",
      titulo: "1. Criar Atividades (Planejado)",
      desc: "Importa a lista de atividades e prazos para a torre, desenhando no gráfico.",
      icon: Layers,
      cor: ORANGE,
      tag: "Criação",
    },
    {
      k: "avanco",
      titulo: "2. Realizar Avanços & Apontamento Físico",
      desc: "Importa % de avanço, pavimento atual e datas de início/fim reais já executados.",
      icon: TrendingUp,
      cor: OK,
      tag: "Medição",
    },
    {
      k: "replanejamento",
      titulo: "3. Replanejamento de Prazos",
      desc: "Atualiza datas de início e fim planejadas das atividades existentes na torre.",
      icon: RefreshCw,
      cor: "#6366f1",
      tag: "Replanejamento",
    },
  ];

  return (
    <Modal T={T} titulo="Importar Planilha" onClose={onClose}>
      <p className="text-xs mb-4" style={{ color: T.muted, lineHeight: 1.6 }}>
        Selecione o objetivo da importação para a obra (Torre ativa: <strong style={{ color: T.text }}>{torreNome || "Todas"}</strong>):
      </p>

      <div className="space-y-2 mb-4">
        {opcoes.map(({ k, titulo, desc, icon: Ic, cor, tag }) => (
          <button
            key={k}
            onClick={() => onSelectTipo(k)}
            className="w-full text-left p-3.5 rounded-sm flex items-start gap-3 transition-all hover:brightness-95 border"
            style={{ border: `1px solid ${T.line}`, background: T.raised }}
          >
            <div
              className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0"
              style={{ background: `${cor}15`, color: cor }}
            >
              <Ic size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold" style={{ color: T.text }}>
                  {titulo}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                  style={{ background: `${cor}20`, color: cor }}
                >
                  {tag}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 3, lineHeight: 1.4 }}>
                {desc}
              </div>
            </div>
          </button>
        ))}
      </div>

      {onBaixarModelo && (
        <div className="p-3 rounded-sm flex items-center justify-between gap-2 border" style={{ background: T.panel, borderColor: T.line }}>
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} style={{ color: ORANGE }} />
            <span className="text-xs" style={{ color: T.text }}>Precisa do modelo padrão?</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onBaixarModelo("atividades")}
              className="text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors font-medium hover:bg-black/5"
              style={{ border: `1px solid ${T.line}`, color: T.text }}
            >
              <Download size={11} /> Modelo Atividades
            </button>
            <button
              onClick={() => onBaixarModelo("avanco")}
              className="text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors font-medium hover:bg-black/5"
              style={{ border: `1px solid ${T.line}`, color: OK }}
            >
              <Download size={11} /> Modelo Avanço
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
