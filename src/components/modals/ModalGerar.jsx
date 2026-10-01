import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Campo } from "../common/Campo";
import { NUM, ORANGE } from "../../constants/theme";

export const ModalGerar = ({ T, onClose, onOk }) => {
  const [f, setF] = useState({ fundacao: true, subsolos: 0, tipo: 25, cobertura: true, tampa: true });
  const n = (f.fundacao ? 1 : 0) + f.subsolos + 1 + f.tipo + (f.cobertura ? 1 : 0) + (f.tampa ? 1 : 0);

  return (
    <Modal T={T} titulo="Gerar pavimentos" onClose={onClose}>
      <p className="text-xs mb-4" style={{ color: T.muted }}>
        Isto substitui os pavimentos e as atividades existentes desta torre.
      </p>

      {/* Pavimentos Base Padrão */}
      <div className="mb-3 p-2 rounded text-xs flex flex-col gap-1.5" style={{ background: T.raised, border: `1px solid ${T.line}` }}>
        <span className="font-bold text-[11px]" style={{ color: ORANGE }}>Pavimentos Padrão:</span>
        <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: T.text }}>
          <input
            type="checkbox"
            checked={f.fundacao}
            onChange={(e) => setF({ ...f, fundacao: e.target.checked })}
            className="cursor-pointer"
          />
          <span><strong>Fundação</strong> (Linha padrão no nível base)</span>
        </label>
        <div className="flex items-center gap-2 pl-5 text-gray-500 text-[11px]">
          <span>✓ <strong>Térreo</strong> (Padrão obrigatório incluído)</span>
        </div>
      </div>

      {[
        ["subsolos", "Subsolos"],
        ["tipo", "Pavimentos tipo"],
      ].map(([k, l]) => (
        <Campo key={k} T={T} label={l}>
          <input
            type="number"
            min={0}
            max={80}
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: Math.max(0, +e.target.value || 0) })}
            className="w-full text-xs px-2 py-1.5 outline-none"
            style={{ ...NUM, border: `1px solid ${T.line}`, background: T.input, color: T.text }}
          />
        </Campo>
      ))}
      {[
        ["cobertura", "Cobertura"],
        ["tampa", "Tampa cobertura"],
      ].map(([k, l]) => (
        <label key={k} className="flex items-center gap-2 mb-2 text-xs cursor-pointer select-none" style={{ color: T.text }}>
          <input
            type="checkbox"
            checked={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.checked })}
            className="cursor-pointer"
          />
          {l}
        </label>
      ))}
      <div className="mt-4 mb-4 p-2.5 text-xs font-semibold" style={{ ...NUM, background: T.raised, color: T.text, border: `1px solid ${T.line}` }}>
        {n} locais serão criados
      </div>
      <button
        onClick={() => onOk(f)}
        className="w-full py-2 text-xs font-bold transition-all hover:brightness-110"
        style={{ background: ORANGE, color: "#fff" }}
      >
        Gerar pavimentos
      </button>
    </Modal>
  );
};
