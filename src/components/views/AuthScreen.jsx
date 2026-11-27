import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { loginComEmail, obterPerfilUsuario } from "../../utils/supabaseClient";
import { obterConfigLogin, iniciarLoginMicrosoft, dentroDeIframe, entrarComMicrosoftPopup } from "../../utils/authMicrosoft";
import { UnitaLogin, LogoMicrosoft } from "../common/UnitaLogin";

/*
 * Tela de login no modelo do "Kit - Tela de Login Unità" (public/unita-login/).
 * O kit só desenha a tela; a autenticação (Microsoft / e-mail e senha) continua a mesma.
 * A tela é sempre clara (identidade visual v2), independente do tema do app.
 */

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

  // cancela a espera do pop-up se esta tela for fechada
  const desmontado = useRef(false);
  useEffect(() => {
    desmontado.current = false;
    return () => { desmontado.current = true; };
  }, []);

  const entrarComMicrosoft = () => {
    setErro("");
    setRedirecionando(true);
    if (!dentroDeIframe()) {
      iniciarLoginMicrosoft(); // aba própria: navega para a Microsoft
      return;
    }
    // Dentro do iframe do portal: login em pop-up (abre ainda dentro do clique)
    entrarComMicrosoftPopup({ cancelado: () => desmontado.current })
      .then((r) => {
        if (!r || desmontado.current) return;
        onLoginSuccess?.(r.user, r.session);
      })
      .catch((e) => {
        if (desmontado.current) return;
        setErro(e?.message || "Falha no login com a Microsoft.");
        setRedirecionando(false);
      });
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

  return (
    <div
      role={isModal ? "dialog" : undefined}
      aria-modal={isModal || undefined}
      style={isModal ? { position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto" } : undefined}
    >
      {isModal && (
        <button
          type="button"
          onClick={onClose}
          title="Fechar (continuar como visualizador)"
          aria-label="Fechar"
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 2,
            width: 36, height: 36, display: "grid", placeItems: "center",
            background: "rgb(255 255 255 / 0.9)", border: "1px solid #e2dfdc", borderRadius: 999,
            color: "#3d3937", cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>
      )}

      <UnitaLogin
        area="Planejamento"
        ferramenta="Tempo × Caminho"
        descricao="Planejamento de obras por linha de balanço: macrofluxos, metas, avanço e histograma."
        titulo="Bem-vindo"
        subtitulo="Entre com a sua conta corporativa Microsoft 365 da Unità."
        erro={erro || null}
        rodape="Tempo × Caminho · Unità Engenharia · uso interno"
      >
        <button
          type="button"
          className="ul-botao"
          onClick={entrarComMicrosoft}
          disabled={carregando || !microsoftDisponivel || redirecionando}
        >
          {redirecionando || carregando ? <span className="ul-girando" /> : <LogoMicrosoft />}
          {redirecionando
            ? (dentroDeIframe() ? "Aguardando o login na janela da Microsoft…" : "Abrindo a Microsoft…")
            : "Entrar com Microsoft 365"}
        </button>

        <p className="ul-nota">
          {!carregando && !microsoftDisponivel
            ? (config?.offline
              ? "Servidor de login indisponível no momento."
              : "Login Microsoft ainda não configurado neste ambiente.")
            : "Acesso restrito a usuários liberados no app."}
        </p>

        {/* E-mail e senha: apenas em modo desenvolvimento */}
        {senhaDisponivel && (
          <>
            <div className="ul-separador">ou</div>
            {!mostrarSenha ? (
              <button type="button" className="ul-link" onClick={() => setMostrarSenha(true)}>
                Entrar com e-mail e senha (modo desenvolvimento)
              </button>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
                <div className="ul-campo">
                  <label htmlFor="ul-email">E-mail</label>
                  <input
                    id="ul-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@unita.com.br"
                    autoComplete="email"
                  />
                </div>
                <div className="ul-campo">
                  <label htmlFor="ul-senha">Senha</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="ul-senha"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      style={{
                        position: "absolute", right: 8, top: 10, background: "transparent",
                        border: "none", cursor: "pointer", color: "#77716d", padding: 2, lineHeight: 0,
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="ul-botao ul-botao-secundario" disabled={loading}>
                  {loading && <span className="ul-girando" />}
                  {loading ? "Entrando..." : "Entrar com e-mail e senha"}
                </button>
              </form>
            )}
          </>
        )}

        {isModal && (
          <button type="button" className="ul-link" onClick={onClose}>
            Continuar navegando como visualizador
          </button>
        )}
      </UnitaLogin>
    </div>
  );
}
