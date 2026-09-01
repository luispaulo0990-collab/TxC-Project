import React, { useRef } from "react";
import { Download, Upload, Info } from "lucide-react";
import { Modal } from "../common/Modal";
import { ORANGE } from "../../constants/theme";

export const ModalReplanejamento = ({
  T,
  torreNome,
  onClose,
  onExportarModelo,
  onImportarArquivo,
}) => {
  const fileRef = useRef(null);

  return (
    <Modal T={T} titulo="Replanejamento via Planilha" onClose={onClose}>
      {/* Cabeçalho informativo */}
      <div
        className="flex items-start gap-2 p-3 mb-4 rounded"
        style={{ background: T.raised, border: `1px solid ${T.line}` }}
      >
        <Info size={14} style={{ color: ORANGE, marginTop: 1, flexShrink: 0 }} />
        <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
          Torre ativa:{" "}
          <strong style={{ color: T.text }}>{torreNome}</strong>. Exporte o
          modelo com as atividades atuais, edite as datas no Excel e reimporte
          para atualizar o planejamento.
        </p>
      </div>

      {/* Passo 1 — Exportar modelo */}
      <div
        className="p-3 mb-3 rounded"
        style={{ border: `1px solid ${T.line}`, background: T.surface }}
      >
        <div className="text-xs font-bold mb-1" style={{ color: T.text }}>
          Passo 1 — Baixar modelo pré-preenchido
        </div>
        <p className="text-xs mb-3" style={{ color: T.muted, lineHeight: 1.6 }}>
          Gera um <strong style={{ color: T.text }}>.xlsx</strong> com as
          atividades da torre atual já preenchidas. Inclui aba de instruções.
          Edite apenas as colunas{" "}
          <strong style={{ color: T.text }}>Inicio</strong> e{" "}
          <strong style={{ color: T.text }}>Fim</strong> no formato{" "}
          <strong style={{ color: T.text }}>DD/MM/AAAA</strong>.
        </p>

        {/* Preview das colunas */}
        <div
          className="mb-3 rounded overflow-hidden"
          style={{ border: `1px solid ${T.line}`, fontSize: 10.5 }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              background: T.raised,
              color: T.text,
              fontWeight: 700,
            }}
          >
            {["Atividade", "Inicio ✎", "Fim ✎", "Torre"].map((col) => (
              <div
                key={col}
                className="px-2 py-1 border-r last:border-r-0"
                style={{ borderColor: T.line }}
              >
                {col}
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              color: T.dim,
            }}
          >
            {["Reboco interno", "01/04/2026", "28/07/2026", torreNome].map(
              (val, i) => (
                <div
                  key={i}
                  className="px-2 py-1 border-r last:border-r-0"
                  style={{ borderColor: T.line }}
                >
                  {val}
                </div>
              )
            )}
          </div>
        </div>

        <button
          onClick={onExportarModelo}
          className="w-full py-2.5 text-xs flex items-center justify-center gap-2 font-bold cursor-pointer hover:brightness-110 transition-all rounded"
          style={{ background: ORANGE, color: "#fff" }}
        >
          <Download size={13} /> Baixar Modelo (.xlsx)
        </button>
      </div>

      {/* Divisor */}
      <div className="flex items-center gap-2 my-3">
        <div className="flex-1 h-px" style={{ background: T.line }} />
        <span className="text-xs" style={{ color: T.muted }}>
          depois de editar as datas
        </span>
        <div className="flex-1 h-px" style={{ background: T.line }} />
      </div>

      {/* Passo 2 — Importar preenchido */}
      <div
        className="p-3 rounded"
        style={{ border: `1px solid ${T.line}`, background: T.surface }}
      >
        <div className="text-xs font-bold mb-1" style={{ color: T.text }}>
          Passo 2 — Importar modelo preenchido
        </div>
        <p className="text-xs mb-3" style={{ color: T.muted, lineHeight: 1.6 }}>
          As atividades serão casadas pelo{" "}
          <strong style={{ color: T.text }}>nome exato</strong>. As datas{" "}
          <strong style={{ color: T.text }}>Inicio</strong> e{" "}
          <strong style={{ color: T.text }}>Fim</strong> substituirão o
          planejamento atual — as linhas no gráfico serão redesenhadas.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onImportarArquivo(f);
              e.target.value = "";
            }
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-2.5 text-xs flex items-center justify-center gap-2 font-bold cursor-pointer hover:brightness-110 transition-all rounded"
          style={{
            background: T.raised,
            color: T.text,
            border: `1px solid ${T.line}`,
          }}
        >
          <Upload size={13} /> Escolher arquivo .xlsx / .csv
        </button>
      </div>
    </Modal>
  );
};

