import React from "react";
import { Layers, AlertCircle, CheckCircle2, X, Loader2 } from "lucide-react";
import { ORANGE, BLACK, FONT } from "../../constants/theme";

/** Cores das telas de acesso (login, solicitar acesso, nova senha, acesso pendente). */
export function coresAuth(tema = "escuro") {
  const isDark = tema === "escuro";
  return {
    isDark,
    bg: isDark ? "#0E100D" : "#ECEDEB",
    cardBg: isDark ? "#171916" : "#FFFFFF",
    border: isDark ? "#282A25" : "#E2E2DF",
    textColor: isDark ? "#ECEDEB" : BLACK,
    mutedColor: isDark ? "#9DA098" : "#6A6E69",
    inputBg: isDark ? "#121411" : "#F7F7F6",
  };
}

const TONS_AVISO = {
  error: { bg: "rgba(214, 69, 69, 0.12)", border: "rgba(214, 69, 69, 0.3)", color: "#E57373", Icon: AlertCircle },
  success: { bg: "rgba(46, 158, 99, 0.12)", border: "rgba(46, 158, 99, 0.3)", color: "#2E9E63", Icon: CheckCircle2 },
  warning: { bg: "rgba(254, 80, 0, 0.10)", border: "rgba(254, 80, 0, 0.3)", color: ORANGE, Icon: AlertCircle },
};

export function AvisoAuth({ tone = "error", title, children, style }) {
  const t = TONS_AVISO[tone];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 8,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.color,
        fontSize: 13,
        lineHeight: 1.45,
        ...style,
      }}
    >
      <t.Icon size={17} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        {title && <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

/** Rótulo + caixa do campo, no padrão da tela de login. */
export function CampoAuth({ label, icon: Icon, hint, error, children, tema, obrigatorio }) {
  const c = coresAuth(tema);
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: c.mutedColor,
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {label}
        {obrigatorio && <span style={{ color: ORANGE }}> *</span>}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: c.inputBg,
          border: `1px solid ${error ? "rgba(214, 69, 69, 0.6)" : c.border}`,
          borderRadius: 8,
          padding: "0 12px",
          transition: "border-color 0.15s ease",
        }}
      >
        {Icon && <Icon size={16} color={c.mutedColor} style={{ marginRight: 10, flexShrink: 0 }} />}
        {children}
      </div>
      {error ? (
        <div style={{ marginTop: 5, fontSize: 12, color: "#E57373" }}>{error}</div>
      ) : (
        hint && <div style={{ marginTop: 5, fontSize: 12, color: c.mutedColor }}>{hint}</div>
      )}
    </div>
  );
}

/** Estilo do <input>/<select>/<textarea> dentro do CampoAuth. */
export function estiloInputAuth(tema) {
  const c = coresAuth(tema);
  return {
    width: "100%",
    height: 42,
    background: "transparent",
    border: "none",
    outline: "none",
    fontSize: 14,
    color: c.textColor,
    fontFamily: FONT,
  };
}

export function BotaoAuth({ children, loading, loadingText, icon: Icon, variant = "primary", tema, style, ...props }) {
  const c = coresAuth(tema);
  const primario = variant === "primary";
  return (
    <button
      type="button"
      disabled={loading}
      {...props}
      style={{
        height: 44,
        borderRadius: 8,
        background: primario ? ORANGE : "transparent",
        color: primario ? "#fff" : c.textColor,
        border: primario ? "none" : `1px solid ${c.border}`,
        fontSize: 14,
        fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "all 0.18s ease",
        opacity: loading ? 0.8 : 1,
        boxShadow: primario ? "0 4px 14px rgba(254,80,0,0.35)" : "none",
        fontFamily: FONT,
        width: "100%",
        ...style,
      }}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {Icon && <Icon size={16} />}
        </>
      )}
    </button>
  );
}

/** Link discreto em laranja (ex.: "Esqueci minha senha", "Solicitar acesso"). */
export function LinkAuth({ children, onClick, muted, tema, style }) {
  const c = coresAuth(tema);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        color: muted ? c.mutedColor : ORANGE,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        padding: "4px 8px",
        textDecoration: "underline",
        textUnderlineOffset: 3,
        fontFamily: FONT,
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.15)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
    >
      {children}
    </button>
  );
}

/**
 * Card das telas de acesso. Com onClose vira modal sobre o app
 * (quem fecha continua navegando como visualizador).
 */
export function AuthLayout({ tema = "escuro", onClose, titulo, descricao, children, rodape }) {
  const c = coresAuth(tema);
  const isModal = typeof onClose === "function";

  return (
    <div
      onClick={isModal ? onClose : undefined}
      style={{
        position: isModal ? "fixed" : "relative",
        top: isModal ? 0 : undefined,
        left: isModal ? 0 : undefined,
        right: isModal ? 0 : undefined,
        bottom: isModal ? 0 : undefined,
        zIndex: isModal ? 9999 : undefined,
        minHeight: isModal ? undefined : "100vh",
        height: isModal ? "100vh" : undefined,
        width: isModal ? "100vw" : undefined,
        background: isModal ? "rgba(0, 0, 0, 0.72)" : c.bg,
        backdropFilter: isModal ? "blur(8px)" : undefined,
        fontFamily: FONT,
        color: c.textColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        overflowY: "auto",
      }}
    >
      {/* Container Principal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: c.cardBg,
          border: `1px solid ${c.border}`,
          borderRadius: 16,
          padding: "36px 32px",
          boxShadow: c.isDark
            ? "0 24px 48px -12px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)"
            : "0 20px 40px -12px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05)",
          position: "relative",
          margin: "auto 0",
        }}
      >
        {isModal && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: c.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              border: `1px solid ${c.border}`,
              color: c.mutedColor,
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = c.textColor;
              e.currentTarget.style.background = c.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = c.mutedColor;
              e.currentTarget.style.background = c.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
            }}
            title="Fechar (continuar como visualizador)"
          >
            <X size={18} />
          </button>
        )}

        {/* Cabeçalho do Card */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: ORANGE,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              marginBottom: 16,
              boxShadow: "0 8px 20px rgba(254,80,0,0.3)",
            }}
          >
            <Layers size={26} />
          </div>

          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: ORANGE, textTransform: "uppercase" }}>
            Tempo × Caminho
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 0.3,
              margin: "4px 0 6px 0",
              color: c.textColor,
            }}
          >
            {titulo}
          </h1>
          {descricao && <p style={{ margin: 0, fontSize: 13, color: c.mutedColor, lineHeight: 1.45 }}>{descricao}</p>}
        </div>

        {children}

        {rodape && (
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: `1px solid ${c.border}`,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
              fontSize: 12.5,
              color: c.mutedColor,
            }}
          >
            {rodape}
          </div>
        )}
      </div>

      {/* Versão no Rodapé da Página */}
      <div style={{ marginTop: 24, fontSize: 11, color: c.mutedColor }}>
        Tempo × Caminho · Supabase Auth
      </div>
    </div>
  );
}
