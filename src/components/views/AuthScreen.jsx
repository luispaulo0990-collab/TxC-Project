import React, { useEffect, useState } from "react";
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, X, ChevronDown } from "lucide-react";
import { loginComEmail, obterPerfilUsuario } from "../../utils/supabaseClient";
import { obterConfigLogin, iniciarLoginMicrosoft } from "../../utils/authMicrosoft";
import {
  ORANGE, ORANGE_HOVER, INK, FONT, FONT_DISPLAY, THEME, RADIUS, SHADOW, OVERLAY, STATUS,
} from "../../constants/theme";
import { LogoUnita } from "../common/LogoUnita";

/* Logo Microsoft (4 quadrados) */
const MicrosoftIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

export function AuthScreen({ onLoginSuccess, tema = "escuro", onClose, erroInicial = "" }) {
  const [config, setConfig] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecionando, setRedirecionando] = useState(false);
  const [erro, setErro] = useState(erroInicial || "");

  const isModal = typeof onClose === "function";
  const T = THEME[tema] || THEME.claro;

  useEffect(() => {
    let vivo = true;
    obterConfigLogin().then((c) => {
      if (!vivo) return;
      setConfig(c);
      // modo dev sem Entra configurado: abre direto o formulário de e-mail/senha
      if (c.devLogin && !c.entraConfigured) setMostrarSenha(true);
    });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!isModal) return;
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [isModal, onClose]);

  const entrarComMicrosoft = () => {
    setErro("");
    setRedirecionando(true);
    iniciarLoginMicrosoft();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErro("Por favor, preencha o email e a senha.");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      const data = await loginComEmail(email.trim(), password);
      if (data?.user) {
        // Enriquecer com o perfil e cargo real salvo no public.profiles
        const enrichedUser = await obterPerfilUsuario(data.user);

        if (typeof window !== "undefined") {
          sessionStorage.setItem("lob:user", JSON.stringify(enrichedUser));
          if (data.session?.access_token) {
            sessionStorage.setItem("lob:auth_token", data.session.access_token);
          }
        }
        if (onLoginSuccess) {
          onLoginSuccess(enrichedUser, data.session);
        }
      } else {
        setErro("Não foi possível autenticar. Verifique seus dados.");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      if (err?.message?.includes("Invalid login credentials") || err?.status === 400) {
        setErro("Email ou senha incorretos.");
      } else if (err?.message?.includes("Email not confirmed")) {
        setErro("Email não confirmado no Supabase.");
      } else {
        setErro(err?.message || "Erro ao conectar com o Supabase.");
      }
    } finally {
      setLoading(false);
    }
  };

  const carregando = config === null;
  const microsoftDisponivel = !!config?.entraConfigured;
  const senhaDisponivel = !!config?.devLogin;

  const inputStyle = {
    width: "100%", height: 42, borderRadius: RADIUS.control,
    border: `1px solid ${T.line}`, background: T.input, color: T.text,
    padding: "0 40px", fontSize: 15, fontFamily: FONT, outline: "none",
    transition: "border-color .15s, box-shadow .15s",
  };

  return (
    <div
      onClick={isModal ? onClose : undefined}
      style={{
        position: isModal ? "fixed" : "relative",
        inset: isModal ? 0 : undefined,
        zIndex: isModal ? 9999 : undefined,
        minHeight: "100vh",
        background: isModal ? OVERLAY : T.bg,
        backdropFilter: isModal ? "blur(4px)" : undefined,
        fontFamily: FONT,
        color: T.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: T.panel,
          border: `1px solid ${T.lineSoft}`,
          borderRadius: RADIUS.card,
          boxShadow: SHADOW.overlay,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Faixa da marca */}
        <div style={{
          background: INK, borderBottom: `2px solid ${ORANGE}`,
          padding: "18px 22px", display: "flex", alignItems: "center", gap: 12,
          position: "relative", overflow: "hidden",
        }}>
          <img
            src="/brand/pattern-un.png" alt="" aria-hidden="true"
            style={{ position: "absolute", left: 0, bottom: -6, width: "220%", maxWidth: "none", opacity: 0.07, pointerEvents: "none" }}
          />
          <LogoUnita ink="#fff" height={28} />
          <span style={{ width: 1, height: 22, background: "rgb(255 255 255 / 0.16)" }} />
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 14.5 }}>Tempo × Caminho</span>
          {isModal && (
            <button
              type="button"
              onClick={onClose}
              title="Fechar (continuar como visualizador)"
              style={{
                marginLeft: "auto", position: "relative",
                background: "transparent", border: "none", color: "#C9C4C0",
                cursor: "pointer", padding: 6, borderRadius: 8, lineHeight: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(255 255 255 / 0.1)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#C9C4C0"; }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div style={{ padding: "26px 26px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: ORANGE }}>
            Acesso
          </div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "4px 0 4px", letterSpacing: "-0.01em" }}>
            Entrar no sistema
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: T.muted }}>
            Use a sua conta corporativa Microsoft 365 da Unità.
          </p>

          {erro && (
            <div style={{
              marginTop: 18, display: "flex", alignItems: "flex-start", gap: 8,
              background: STATUS.errorSoft, color: STATUS.error,
              borderRadius: RADIUS.control, padding: "10px 12px", fontSize: 13.5,
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{erro}</span>
            </div>
          )}

          {/* Botão Microsoft */}
          <button
            type="button"
            onClick={entrarComMicrosoft}
            disabled={carregando || !microsoftDisponivel || redirecionando}
            style={{
              marginTop: 20, width: "100%", height: 44,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              borderRadius: RADIUS.control, border: "1px solid transparent",
              background: ORANGE, color: "#fff",
              fontSize: 15.5, fontWeight: 500, fontFamily: FONT,
              cursor: carregando || !microsoftDisponivel || redirecionando ? "not-allowed" : "pointer",
              opacity: carregando || !microsoftDisponivel ? 0.55 : 1,
              boxShadow: "0 2px 8px rgb(254 80 0 / 0.2)",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = ORANGE_HOVER; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ORANGE; }}
          >
            {redirecionando || carregando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <span style={{ background: "#fff", borderRadius: 4, padding: 3, lineHeight: 0 }}>
                <MicrosoftIcon size={14} />
              </span>
            )}
            <span>{redirecionando ? "Abrindo a Microsoft…" : "Entrar com Microsoft"}</span>
          </button>

          {!carregando && !microsoftDisponivel && (
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: T.muted, textAlign: "center" }}>
              {config?.offline
                ? "Servidor de login indisponível no momento."
                : "Login Microsoft ainda não configurado neste ambiente."}
            </p>
          )}

          {/* E-mail e senha: apenas em modo desenvolvimento */}
          {senhaDisponivel && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${T.lineSoft}`, paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "transparent", border: "none", cursor: "pointer",
                  color: T.muted, fontSize: 13.5, fontFamily: FONT, padding: "2px 0",
                }}
              >
                <span>Entrar com e-mail e senha <span style={{ color: STATUS.warning }}>(modo desenvolvimento)</span></span>
                <ChevronDown size={15} style={{ transform: mostrarSenha ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
              </button>

              {mostrarSenha && (
                <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: T.muted }}>E-mail</span>
                    <span style={{ position: "relative" }}>
                      <Mail size={16} color={T.dim} style={{ position: "absolute", left: 13, top: 13 }} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@unita.com.br"
                        autoComplete="email"
                        style={inputStyle}
                      />
                    </span>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: T.muted }}>Senha</span>
                    <span style={{ position: "relative" }}>
                      <Lock size={16} color={T.dim} style={{ position: "absolute", left: 13, top: 13 }} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        style={{ position: "absolute", right: 8, top: 8, background: "transparent", border: "none", cursor: "pointer", color: T.muted, padding: 4, lineHeight: 0 }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      height: 42, borderRadius: RADIUS.control,
                      border: `1px solid ${T.line}`, background: T.panel, color: T.text,
                      fontSize: 15, fontWeight: 500, fontFamily: FONT,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    <span>{loading ? "Entrando..." : "Entrar no Sistema"}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          <div style={{ marginTop: 18, textAlign: "center", fontSize: 12.5, color: T.muted }}>
            Acesso restrito a usuários liberados no app.
          </div>

          {isModal && (
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 10, width: "100%", height: 38, borderRadius: RADIUS.control,
                background: "transparent", border: "none", color: T.text,
                fontSize: 14, fontWeight: 500, fontFamily: FONT, cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Continuar navegando como visualizador
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: isModal ? "#E2DFDC" : T.muted }}>
        Tempo × Caminho · Unità Engenharia
      </div>
    </div>
  );
}
