import React, { useState } from "react";
import { Layers, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { loginComEmail } from "../../utils/supabaseClient";
import { ORANGE, BLACK, FONT, NUM } from "../../constants/theme";

export function AuthScreen({ onLoginSuccess, tema = "escuro" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const isDark = tema === "escuro";
  const bg = isDark ? "#0E100D" : "#ECEDEB";
  const cardBg = isDark ? "#171916" : "#FFFFFF";
  const border = isDark ? "#282A25" : "#E2E2DF";
  const textColor = isDark ? "#ECEDEB" : BLACK;
  const mutedColor = isDark ? "#9DA098" : "#6A6E69";
  const inputBg = isDark ? "#121411" : "#F7F7F6";

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
        if (typeof window !== "undefined") {
          localStorage.setItem("lob:user", JSON.stringify(data.user));
          if (data.session?.access_token) {
            localStorage.setItem("lob:auth_token", data.session.access_token);
          }
        }
        if (onLoginSuccess) {
          onLoginSuccess(data.user, data.session);
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        fontFamily: FONT,
        color: textColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
      }}
    >
      {/* Container Principal */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: "36px 32px",
          boxShadow: isDark
            ? "0 24px 48px -12px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)"
            : "0 20px 40px -12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Cabeçalho do Card */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
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

          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 0.5,
              margin: "0 0 6px 0",
              color: textColor,
            }}
          >
            TEMPO × CAMINHO
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: mutedColor }}>
            Linha de Balanço & Planejamento de Obras
          </p>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(214, 69, 69, 0.12)",
              border: "1px solid rgba(214, 69, 69, 0.3)",
              color: "#E57373",
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{erro}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Campo Email */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: mutedColor,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Email
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: inputBg,
                border: `1px solid ${border}`,
                borderRadius: 8,
                padding: "0 12px",
                transition: "border-color 0.15s ease",
              }}
            >
              <Mail size={16} color={mutedColor} style={{ marginRight: 10, flexShrink: 0 }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com"
                disabled={loading}
                autoFocus
                style={{
                  width: "100%",
                  height: 42,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  color: textColor,
                  fontFamily: FONT,
                }}
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: mutedColor,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Senha
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: inputBg,
                border: `1px solid ${border}`,
                borderRadius: 8,
                padding: "0 12px",
                transition: "border-color 0.15s ease",
              }}
            >
              <Lock size={16} color={mutedColor} style={{ marginRight: 10, flexShrink: 0 }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: "100%",
                  height: 42,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  color: textColor,
                  fontFamily: FONT,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: mutedColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 10,
              height: 44,
              borderRadius: 8,
              background: ORANGE,
              color: "#fff",
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.18s ease",
              opacity: loading ? 0.8 : 1,
              boxShadow: "0 4px 14px rgba(254,80,0,0.35)",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Rodapé do Card */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: `1px solid ${border}`,
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 11.5, color: mutedColor }}>
            🔒 Acesso restrito para usuários autorizados
          </span>
        </div>
      </div>

      {/* Versão no Rodapé da Página */}
      <div style={{ marginTop: 24, fontSize: 11, color: mutedColor }}>
        Tempo × Caminho · Supabase Auth
      </div>
    </div>
  );
}
