import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Campo } from "../common/Campo";
import { NUM, ORANGE } from "../../constants/theme";
import { FileSpreadsheet, Image as ImageIcon } from "lucide-react";

export const ModalExport = ({ T, nomePadrao, onClose, onOk }) => {
  const [nome, setNome] = useState(nomePadrao || "tempo-x-caminho");

  return (
    <Modal T={T} titulo="Exportar Empreendimento" onClose={onClose}>
      <Campo T={T} label="Nome do arquivo base">
        <div className="flex items-center rounded-sm" style={{ border: `1px solid ${T.line}`, background: T.input }}>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="flex-1 text-xs px-3 py-2 outline-none bg-transparent font-medium"
            style={{ ...NUM, color: T.text }}
            placeholder="Nome do arquivo..."
            autoFocus
          />
        </div>
      </Campo>

      <div style={{ fontSize: 10, letterSpacing: 1.1, color: T.dim, fontWeight: 700, marginBottom: 8, marginTop: 12 }}>
        FORMATOS DISPONÍVEIS
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Exportar Excel */}
        <button
          onClick={() => {
            onOk("xlsx", nome);
            onClose();
          }}
          className="p-3.5 rounded-sm flex flex-col items-start gap-2 transition-all hover:brightness-95 text-left border"
          style={{
            background: T.raised,
            borderColor: T.line,
          }}
        >
          <div
            className="w-8 h-8 rounded flex items-center justify-center font-bold text-white shrink-0"
            style={{ background: "#1D6F42" }}
          >
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: T.text }}>
              Planilha Excel (.xlsx)
            </div>
            <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2, lineHeight: 1.3 }}>
              Cronograma completo, dados de avanço, pavimentos e situação atual.
            </div>
          </div>
        </button>

        {/* Exportar PNG */}
        <button
          onClick={() => {
            onOk("png", nome);
            onClose();
          }}
          className="p-3.5 rounded-sm flex flex-col items-start gap-2 transition-all hover:brightness-105 text-left border"
          style={{
            background: ORANGE,
            borderColor: ORANGE,
            color: "#ffffff",
          }}
        >
          <div
            className="w-8 h-8 rounded flex items-center justify-center font-bold text-white shrink-0 bg-white/20"
          >
            <ImageIcon size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              Imagem Gráfica (.png)
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.85)", marginTop: 2, lineHeight: 1.3 }}>
              Linha de Balanço renderizada em alta resolução (2x Retina) para relatórios.
            </div>
          </div>
        </button>
      </div>

      <p className="text-xs" style={{ color: T.dim, lineHeight: 1.5 }}>
        Arquivos são gerados e baixados instantaneamente no seu navegador.
      </p>
    </Modal>
  );
};
