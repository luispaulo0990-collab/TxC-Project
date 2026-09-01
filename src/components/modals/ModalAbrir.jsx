import React, { useRef } from "react";
import { Modal } from "../common/Modal";
import { NUM, ORANGE } from "../../constants/theme";
import { Upload } from "lucide-react";

export const ModalAbrir = ({ T, projId, salvos = [], onClose, onAbrir, onRestaurarExemplo, onCarregarJSON }) => {
  const jsonInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onCarregarJSON) {
      onCarregarJSON(file);
    }
    e.target.value = "";
  };

  return (
    <Modal T={T} onClose={onClose} titulo="Abrir empreendimento">
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {salvos.length === 0 ? (
        <p className="text-xs" style={{ color: T.muted }}>
          Nenhum empreendimento salvo no navegador ainda.
        </p>
      ) : (
        <div className="max-h-60 overflow-y-auto pr-1">
          {salvos.map((s) => (
            <button
              key={s.id}
              onClick={() => onAbrir(s.id)}
              className="w-full text-left px-3 py-2.5 mb-1 flex items-center justify-between transition-colors hover:brightness-95"
              style={{
                border: `1px solid ${s.id === projId ? ORANGE : T.line}`,
                background: T.raised,
              }}
            >
              <span className="text-xs font-bold">{s.nome}</span>
              <span style={{ ...NUM, fontSize: 10, color: T.dim }}>
                {new Date(s.em).toLocaleDateString("pt-BR")}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => jsonInputRef.current?.click()}
          className="flex-1 py-2 text-xs flex items-center justify-center gap-1.5 transition-colors hover:brightness-95"
          style={{ border: `1px solid ${T.line}`, background: T.raised, color: T.text }}
        >
          <Upload size={13} /> Carregar arquivo .json
        </button>
        <button
          onClick={onRestaurarExemplo}
          className="flex-1 py-2 text-xs transition-colors hover:bg-black/5"
          style={{ border: `1px dashed ${T.line}`, color: T.muted }}
        >
          Restaurar exemplo
        </button>
      </div>
    </Modal>
  );
};

