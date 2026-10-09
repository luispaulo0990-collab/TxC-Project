import React from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { Modal } from "../common/Modal";
import { NUM, ORANGE, OK } from "../../constants/theme";

export const ModalImportar = ({ T, tipo, onClose, onPickFile, onBaixarModelo }) => {
  const isAvanco = tipo === "avanco" || tipo === "real";
  const rotulo = isAvanco
    ? "Realizar Avanços Físicos"
    : tipo === "replanejamento"
    ? "Replanejamento de Prazos"
    : "Criar Atividades na Torre";

  return (
    <Modal T={T} titulo={`Importar · ${rotulo}`} onClose={onClose}>
      <div className="mb-3 p-3 rounded-sm border" style={{ ...NUM, fontSize: 11, background: T.raised, borderColor: T.line }}>
        <div className="text-[10px] uppercase font-bold tracking-wider mb-2" style={{ color: T.dim }}>
          Exemplo de Colunas Suportadas na Planilha:
        </div>
        {isAvanco ? (
          <>
            <div className="grid grid-cols-4 gap-2 font-bold text-xs" style={{ color: T.text }}>
              <span>Atividade</span>
              <span>% Avanço</span>
              <span>Pavimento Atual</span>
              <span>Início Real</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-1.5 text-xs" style={{ color: T.dim }}>
              <span>Estrutura</span>
              <span>65%</span>
              <span>12º Pavimento</span>
              <span>10/03/2026</span>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 font-bold text-xs" style={{ color: T.text }}>
              <span>Atividade</span>
              <span>Inicio</span>
              <span>Fim</span>
              <span>Torre (opcional)</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-1.5 text-xs" style={{ color: T.dim }}>
              <span>Alvenaria</span>
              <span>01/04/2026</span>
              <span>28/07/2026</span>
              <span>Torre 1</span>
            </div>
          </>
        )}
      </div>

      <p className="text-xs mb-4" style={{ color: T.muted, lineHeight: 1.6 }}>
        {isAvanco
          ? "As atividades serão identificadas pelo nome (e torre, se informada). Os campos de % de avanço, pavimento alcançado e datas reais serão atualizados e representados no gráfico."
          : tipo === "replanejamento"
          ? "As atividades existentes serão identificadas pelo nome ou ID. As datas de início e fim serão atualizadas no planejamento da obra."
          : "As novas atividades serão geradas e vinculadas aos pavimentos da torre selecionada com as datas e velocidades calculadas."}
      </p>

      <div className="flex gap-2">
        {onBaixarModelo && (
          <button
            type="button"
            onClick={() => onBaixarModelo(isAvanco ? "avanco" : tipo === "replanejamento" ? "replanejamento" : "atividades")}
            className="px-3 py-2.5 text-xs flex items-center justify-center gap-1.5 rounded font-semibold border transition-colors hover:bg-black/5"
            style={{ borderColor: T.line, color: T.text, background: T.raised }}
          >
            <Download size={14} /> Baixar Modelo .xlsx
          </button>
        )}
        <button
          type="button"
          onClick={onPickFile}
          className="flex-1 py-2.5 text-xs flex items-center justify-center gap-2 font-bold rounded cursor-pointer hover:brightness-110 transition-all text-white shadow-sm"
          style={{ background: isAvanco ? OK : ORANGE }}
        >
          <Upload size={14} /> Selecionar Planilha Excel (.xlsx)
        </button>
      </div>
    </Modal>
  );
};
