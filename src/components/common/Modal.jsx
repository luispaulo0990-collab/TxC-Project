import React from "react";
import { X } from "lucide-react";
import { FONT, FONT_DISPLAY, OVERLAY, SHADOW, RADIUS } from "../../constants/theme";

export const Modal = ({ T, titulo, children, onClose, maxWidth = "max-w-sm" }) => (
  <div
    className="fixed inset-0 flex items-center justify-center p-6"
    style={{ background: OVERLAY, zIndex: 50, backdropFilter: "blur(2px)" }}
    onClick={onClose}
  >
    <div
      className={`w-full ${maxWidth}`}
      style={{
        background: T.panel,
        border: `1px solid ${T.lineSoft || T.line}`,
        borderRadius: RADIUS.card,
        boxShadow: SHADOW.overlay,
        padding: "18px 22px 20px",
        fontFamily: FONT,
        color: T.text,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em", margin: 0 }}>
          {titulo}
        </h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center transition-colors"
          style={{ lineHeight: 0, width: 30, height: 30, borderRadius: RADIUS.control, color: T.muted }}
          onMouseEnter={(e) => (e.currentTarget.style.background = T.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);
