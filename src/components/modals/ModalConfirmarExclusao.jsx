// src/components/modals/ModalConfirmarExclusao.jsx
import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { FONT, ERRO, BLACK } from "../../constants/theme";

export const ModalConfirmarExclusao = ({
  T,
  titulo = "Confirmar Exclusão",
  mensagem = "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.",
  itemNome,
  textoBotao = "Sim, Excluir",
  onConfirmar,
  onCancelar,
}) => {
  // Fechar com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancelar?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancelar]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
      }}
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-sm rounded-lg p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: T?.panel || "#FFFFFF",
          border: `1.5px solid ${T?.line || "#E5E7EB"}`,
          fontFamily: FONT,
          color: T?.text || BLACK,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão de Fechar no canto superior */}
        <button
          onClick={onCancelar}
          className="absolute top-4 right-4 p-1 rounded-sm opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          title="Fechar"
        >
          <X size={16} style={{ color: T?.dim || "#6B7280" }} />
        </button>

        {/* Cabeçalho com Ícone de Alerta */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(214, 69, 69, 0.12)",
              color: ERRO,
              border: `1px solid rgba(214, 69, 69, 0.25)`,
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: T?.text || BLACK }}>
              {titulo}
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: T?.dim || "#6B7280" }}>
              {mensagem}
            </p>
          </div>
        </div>

        {/* Destaque do Nome do Item (se houver) */}
        {itemNome && (
          <div
            className="my-3 px-3 py-2 rounded text-xs font-semibold break-all flex items-center gap-2"
            style={{
              background: T?.raised || "rgba(0,0,0,0.03)",
              border: `1px solid ${T?.line || "#E5E7EB"}`,
              color: T?.text || BLACK,
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: ERRO }}
            />
            <span className="truncate">{itemNome}</span>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-2 px-3 text-xs font-semibold rounded transition-colors hover:brightness-95 cursor-pointer"
            style={{
              border: `1px solid ${T?.line || "#D1D5DB"}`,
              background: T?.raised || "#F3F4F6",
              color: T?.text || BLACK,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="flex-1 py-2 px-3 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all hover:brightness-110 shadow-sm cursor-pointer text-white"
            style={{
              background: ERRO,
            }}
          >
            <Trash2 size={13} />
            {textoBotao}
          </button>
        </div>
      </div>
    </div>
  );
};
