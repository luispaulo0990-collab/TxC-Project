import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Campo } from "../common/Campo";
import { NUM, ORANGE } from "../../constants/theme";

export const ModalExport = ({ T, nomePadrao, onClose, onOk }) => {
  const [nome, setNome] = useState(nomePadrao || "tempo-x-caminho");

  const botao = (fmt, label) => (
    <button
      key={fmt}
      onClick={() => {
        onOk(fmt, nome);
        onClose();
      }}
      className="flex-1 py-2.5 text-xs font-bold transition-all hover:brightness-105"
      style={{
        background: fmt === "png" ? ORANGE : T.raised,
        color: fmt === "png" ? "#fff" : T.text,
        border: `1px solid ${fmt === "png" ? ORANGE : T.line}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <Modal T={T} titulo="Exportar" onClose={onClose}>
      <Campo T={T} label="Nome do arquivo">
        <div className="flex items-center" style={{ border: `1px solid ${T.line}`, background: T.input }}>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="flex-1 text-xs px-2 py-2 outline-none bg-transparent"
            style={{ ...NUM, color: T.text }}
            autoFocus
          />
          <span className="px-2 text-xs" style={{ color: T.dim }}>
            .ext
          </span>
        </div>
      </Campo>
      <div style={{ fontSize: 9.5, letterSpacing: 1.1, color: T.dim, fontWeight: 700, marginBottom: 6 }}>
        PLANILHAS E DADOS
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {botao("xlsx", "Excel (.xlsx)")}
        {botao("xml", "XML (.xml)")}
        {botao("csv", "CSV (.csv)")}
      </div>

      <div style={{ fontSize: 9.5, letterSpacing: 1.1, color: T.dim, fontWeight: 700, marginBottom: 6 }}>
        GRÁFICOS E BACKUP
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {botao("png", "PNG")}
        {botao("svg", "SVG")}
        {botao("json", "JSON")}
      </div>
      <p className="text-xs" style={{ color: T.dim, lineHeight: 1.5 }}>
        As planilhas (Excel e XML) incluem atividade, torre, período (início/fim), pavimento atual (hoje) e cronograma detalhado.
      </p>
    </Modal>
  );
};
