import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Campo } from "../common/Campo";
import { NUM, ORANGE } from "../../constants/theme";

export const ModalGerar = ({ T, onClose, onOk }) => {
  const [f, setF] = useState({ subsolos: 0, tipo: 25, cobertura: true, tampa: true });
  const n = f.subsolos + 1 + f.tipo + (f.cobertura ? 1 : 0) + (f.tampa ? 1 : 0);

  return (
    <Modal T={T} titulo="Gerar pavimentos" onClose={onClose}>
      <p className="text-xs mb-4" style={{ color: T.muted }}>
        Isto substitui os pavimentos e as atividades existentes desta torre.
      </p>
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
