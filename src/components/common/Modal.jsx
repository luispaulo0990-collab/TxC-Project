import React from "react";
import { X } from "lucide-react";
import { FONT } from "../../constants/theme";

export const Modal = ({ T, titulo, children, onClose, maxWidth = "max-w-sm" }) => (
  <div
    className="fixed inset-0 flex items-center justify-center p-6"
    style={{ background: "rgba(0,0,0,0.62)", zIndex: 50 }}
    onClick={onClose}
  >
    <div
      className={`w-full ${maxWidth} p-5 shadow-2xl rounded-sm`}
      style={{ background: T.panel, border: `1px solid ${T.line}`, fontFamily: FONT, color: T.text }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm" style={{ fontWeight: 700 }}>
          {titulo}
        </h2>
        <button onClick={onClose} className="p-1 hover:opacity-75 transition-opacity" style={{ lineHeight: 0 }}>
          <X size={16} style={{ color: T.dim }} />
        </button>
      </div>
      {children}
    </div>
  </div>
);
