import React from "react";
import { Upload } from "lucide-react";
import { Modal } from "../common/Modal";
import { NUM, ORANGE } from "../../constants/theme";

export const ModalImportar = ({ T, tipo, onClose, onPickFile }) => {
  const rotulo = tipo === "real" ? "Realizado" : tipo === "falta" ? "A executar" : "Planejado";

  return (
    <Modal T={T} titulo={`Importar · ${rotulo}`} onClose={onClose}>
      <div className="mb-3 p-2.5" style={{ ...NUM, fontSize: 11, background: T.raised, border: `1px solid ${T.line}` }}>
        <div className="grid grid-cols-3 gap-2" style={{ fontWeight: 700, color: T.text }}>
          <span>Atividade</span>
          <span>Inicio</span>
          <span>Fim</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-1" style={{ color: T.dim }}>
          <span>Reboco interno</span>
          <span>01/04/2026</span>
          <span>28/07/2026</span>
        </div>
      </div>
      {tipo === "real" && (
        <p className="text-xs mb-3" style={{ color: T.muted, lineHeight: 1.6 }}>
          O nome de cada linha precisa coincidir com uma atividade já existente na torre. As datas viram a linha tracejada vermelha do realizado.
        </p>
      )}
      <button
        onClick={onPickFile}
        className="w-full py-2.5 text-xs flex items-center justify-center gap-2 font-bold cursor-pointer hover:brightness-110 transition-all"
        style={{ background: ORANGE, color: "#fff" }}
      >
        <Upload size={14} /> Escolher arquivo .xlsx / .csv
      </button>
    </Modal>
  );
};
