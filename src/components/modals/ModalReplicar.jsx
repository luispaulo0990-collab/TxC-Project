import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Campo } from "../common/Campo";
import { NUM, ORANGE } from "../../constants/theme";

export const ModalReplicar = ({ T, proj, onClose, onOk }) => {
  const [origem, setOrigem] = useState(proj.torres[0]?.id || "");
  const [offset, setOffset] = useState(45);

  return (
    <Modal T={T} titulo="Replicar torre com defasagem" onClose={onClose}>
      <p className="text-xs mb-4" style={{ color: T.muted }}>
        Copia pavimentos e atividades da torre de origem, deslocando todas as datas.
      </p>
      <Campo T={T} label="Torre de origem">
        <select
          value={origem}
          onChange={(e) => setOrigem(e.target.value)}
          className="w-full text-xs px-2 py-1.5 outline-none"
          style={{ ...NUM, border: `1px solid ${T.line}`, background: T.input, color: T.text }}
        >
          {proj.torres.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo T={T} label="Defasagem em dias corridos">
        <input
          type="number"
          value={offset}
          onChange={(e) => setOffset(+e.target.value || 0)}
          className="w-full text-xs px-2 py-1.5 outline-none"
          style={{ ...NUM, border: `1px solid ${T.line}`, background: T.input, color: T.text }}
        />
      </Campo>
      <button
        onClick={() => onOk(origem, offset)}
        className="w-full py-2 text-xs mt-2 font-bold transition-all hover:brightness-110"
        style={{ background: ORANGE, color: "#fff" }}
      >
        Replicar torre
      </button>
    </Modal>
  );
};
