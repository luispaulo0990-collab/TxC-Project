import React from "react";
import { Layers, CalendarClock, TrendingUp, RefreshCw } from "lucide-react";
import { Modal } from "../common/Modal";
import { ORANGE, ERRO } from "../../constants/theme";

export const ModalImportMenu = ({ T, torreNome, onClose, onSelectTipo }) => {
  const opcoes = [
    { k: "plan", titulo: "Planejado", desc: "Cria as atividades em preto, como linhas", icon: Layers, cor: ORANGE },
    { k: "falta", titulo: "A executar (o que falta)", desc: "Importa o saldo pendente como novas atividades", icon: CalendarClock, cor: ORANGE },
    { k: "real", titulo: "Realizado", desc: "Desenha linha tracejada vermelha; casa por nome com o planejado", icon: TrendingUp, cor: ERRO },
    { k: "replanejamento", titulo: "Replanejamento", desc: "Atualiza as datas planejadas de atividades existentes — exporta modelo e reimporta preenchido", icon: RefreshCw, cor: "#6366f1" },
  ];

  return (
    <Modal T={T} titulo="Importar planilha" onClose={onClose}>
      <p className="text-xs mb-4" style={{ color: T.muted, lineHeight: 1.6 }}>
        Escolha o que importar para a torre <strong style={{ color: T.text }}>{torreNome}</strong>. A planilha precisa ter as colunas <strong style={{ color: T.text }}>Atividade</strong>, <strong style={{ color: T.text }}>Inicio</strong> e <strong style={{ color: T.text }}>Fim</strong>.
      </p>
      {opcoes.map(({ k, titulo, desc, icon: Ic, cor }) => (
        <button
          key={k}
          onClick={() => onSelectTipo(k)}
          className="w-full text-left p-3 mb-2 flex items-start gap-3 transition-colors hover:brightness-95"
          style={{ border: `1px solid ${T.line}`, background: T.raised }}
        >
          <Ic size={18} style={{ color: cor, marginTop: 2, flexShrink: 0 }} />
          <div>
            <div className="text-xs" style={{ fontWeight: 700, color: T.text }}>
              {titulo}
            </div>
            <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>
              {desc}
            </div>
          </div>
        </button>
      ))}
    </Modal>
  );
};
