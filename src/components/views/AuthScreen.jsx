import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, ArrowRight, ArrowLeft, User, Send, ShieldCheck, MessageSquare } from "lucide-react";
import { loginComEmail, obterPerfilUsuario, traduzirErroAuth, enviarLinkRedefinicaoSenha, solicitarAcesso } from "../../utils/supabaseClient";
import { CARGOS_SOLICITAVEIS, DOMINIOS_CORPORATIVOS, isEmailCorporativo } from "../../constants/acesso";
import { AuthLayout, AvisoAuth, BotaoAuth, CampoAuth, LinkAuth, coresAuth, estiloInputAuth } from "./AuthLayout";

const DOMINIOS_TEXTO = DOMINIOS_CORPORATIVOS.map((d) => "@" + d).join(" ou ");
const FORM_SOLICITACAO_VAZIO = { nome: "", email: "", cargo: "admin", mensagem: "", website: "" };

/**
 * Login com as credenciais do Supabase Auth, pedido de nova senha por e-mail
 * e solicitação de acesso (ninguém cria a própria conta).
 */
export function AuthScreen({ onLoginSuccess, tema = "escuro", onClose }) {
  const [modo, setModo] = useState("login"); // login | esqueci | solicitar
  const isModal = typeof onClose === "function";

  const rodapeVisualizador = isModal && (
    <LinkAuth tema={tema} onClick={onClose}>
      Continuar navegando como visualizador
    </LinkAuth>
  );

  if (modo === "esqueci") {
    return <EsqueciSenha tema={tema} onClose={onClose} onVoltar={() => setModo("login")} />;
  }
  if (modo === "solicitar") {
    return <SolicitarAcesso tema={tema} onClose={onClose} onVoltar={() => setModo("login")} rodapeExtra={rodapeVisualizador} />;
  }
  return (
    <Login
      tema={tema}
      onClose={onClose}
      onLoginSuccess={onLoginSuccess}
      onEsqueci={() => setModo("esqueci")}
      onSolicitar={() => setModo("solicitar")}
      rodapeExtra={rodapeVisualizador}
    />
  );
}

function Login({ tema, onClose, onLoginSuccess, onEsqueci, onSolicitar, rodapeExtra }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const c = coresAuth(tema);
  const inputStyle = estiloInputAuth(tema);

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
      setErro(err?.status === 400 && !err?.message ? "Email ou senha incorretos." : traduzirErroAuth(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      tema={tema}
      onClose={onClose}
      titulo="Entrar"
      descricao="Linha de Balanço & Planejamento de Obras"
      rodape={
        <>
          <span>
            Ainda não tem acesso?{" "}
            <LinkAuth tema={tema} onClick={onSolicitar} style={{ padding: 0 }}>
              Solicitar acesso
            </LinkAuth>
          </span>
          <span style={{ fontSize: 11.5 }}>🔒 Acesso restrito para usuários autorizados</span>
          {rodapeExtra}
        </>
      }
    >
      {erro && <AvisoAuth style={{ marginBottom: 20 }}>{erro}</AvisoAuth>}

      {/* Formulário de Login */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CampoAuth label="Email" icon={Mail} tema={tema}>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@empresa.com"
            disabled={loading}
            autoFocus
            style={inputStyle}
          />
        </CampoAuth>

        <CampoAuth label="Senha" icon={Lock} tema={tema}>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: c.mutedColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={showPassword ? "Ocultar senha" : "Ver senha"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </CampoAuth>

        <BotaoAuth type="submit" tema={tema} loading={loading} loadingText="Entrando..." icon={ArrowRight} style={{ marginTop: 10 }}>
          Entrar no Sistema
        </BotaoAuth>

        <LinkAuth tema={tema} muted onClick={onEsqueci} style={{ alignSelf: "center" }}>
          Esqueci minha senha
        </LinkAuth>
      </form>
    </AuthLayout>
  );
}

function EsqueciSenha({ tema, onClose, onVoltar }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }
    setLoading(true);
    setErro("");
    try {
      await enviarLinkRedefinicaoSenha(email);
      setEnviado(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout tema={tema} onClose={onClose} titulo="Esqueci minha senha" descricao="Enviaremos um link para você definir uma nova senha.">
      {enviado ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AvisoAuth tone="success" title="Verifique seu e-mail">
            Se {email.trim()} estiver cadastrado, você vai receber um link em alguns minutos. Confira também a caixa de spam.
          </AvisoAuth>
          <BotaoAuth variant="secondary" tema={tema} onClick={onVoltar}>
            <ArrowLeft size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Voltar para o login
          </BotaoAuth>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <CampoAuth label="Email" icon={Mail} tema={tema}>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@empresa.com"
              disabled={loading}
              autoFocus
              style={estiloInputAuth(tema)}
            />
          </CampoAuth>
          {erro && <AvisoAuth>{erro}</AvisoAuth>}
          <BotaoAuth type="submit" tema={tema} loading={loading} loadingText="Enviando..." icon={Send}>
            Enviar link
          </BotaoAuth>
          <LinkAuth tema={tema} muted onClick={onVoltar} style={{ alignSelf: "center" }}>
            Voltar para o login
          </LinkAuth>
        </form>
      )}
    </AuthLayout>
  );
}

function validarSolicitacao(form) {
  const erros = {};
  const nome = form.nome.trim();
  const email = form.email.trim().toLowerCase();
  if (nome.length < 3) erros.nome = "Informe o nome completo.";
  else if (nome.length > 120) erros.nome = "Use até 120 caracteres.";
  if (!email) erros.email = "Informe seu e-mail.";
  else if (email.length > 160 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) erros.email = "Informe um e-mail válido.";
  else if (!isEmailCorporativo(email)) erros.email = `Use seu e-mail corporativo (${DOMINIOS_TEXTO}).`;
  if (!CARGOS_SOLICITAVEIS.some((c) => c.id === form.cargo)) erros.cargo = "Escolha um perfil.";
  if (form.mensagem.length > 1000) erros.mensagem = "Use até 1000 caracteres.";
  return erros;
}

/**
 * Quem não tem acesso pede aqui. Não cria conta: o pedido vai para a tabela access_requests
 * no Supabase, onde a gestão aprova e convida o e-mail.
 */
function SolicitarAcesso({ tema, onClose, onVoltar, rodapeExtra }) {
  const [form, setForm] = useState(FORM_SOLICITACAO_VAZIO);
  const [erros, setErros] = useState({});
  const [loading, setLoading] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviado, setEnviado] = useState(false);
  const c = coresAuth(tema);
  const inputStyle = estiloInputAuth(tema);
  const cargoSelecionado = CARGOS_SOLICITAVEIS.find((cg) => cg.id === form.cargo);

  const set = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const encontrados = validarSolicitacao(form);
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;

    // Campo-isca preenchido: finge que deu certo e não envia
    if (form.website) {
      setEnviado(true);
      return;
    }

    setLoading(true);
    setErroEnvio("");
    try {
      await solicitarAcesso(form);
      setEnviado(true);
    } catch (err) {
      setErroEnvio(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <AuthLayout tema={tema} onClose={onClose} titulo="Pedido enviado" rodape={rodapeExtra}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AvisoAuth tone="success" title="Recebemos seu pedido">
            A gestão vai analisar. Quando o acesso for liberado, você recebe um e-mail em {form.email.trim().toLowerCase()} para definir sua senha.
          </AvisoAuth>
          <BotaoAuth variant="secondary" tema={tema} onClick={onVoltar}>
            <ArrowLeft size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Voltar para o login
          </BotaoAuth>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      tema={tema}
      onClose={onClose}
      titulo="Solicitar acesso"
      descricao="Ninguém cria a própria conta: seu pedido vai para a gestão, que libera o acesso."
      rodape={rodapeExtra}
    >
      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CampoAuth label="Nome completo" icon={User} tema={tema} obrigatorio error={erros.nome}>
          <input
            value={form.nome}
            onChange={(e) => set("nome", e.target.value)}
            autoComplete="name"
            maxLength={120}
            autoFocus
            disabled={loading}
            style={inputStyle}
          />
        </CampoAuth>

        <CampoAuth label="E-mail corporativo" icon={Mail} tema={tema} obrigatorio error={erros.email} hint={`Somente ${DOMINIOS_TEXTO}`}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
            maxLength={160}
            placeholder={`nome${DOMINIOS_TEXTO.split(" ")[0]}`}
            disabled={loading}
            style={inputStyle}
          />
        </CampoAuth>

        <CampoAuth label="Perfil" icon={ShieldCheck} tema={tema} obrigatorio error={erros.cargo} hint={cargoSelecionado?.descricao}>
          <select
            value={form.cargo}
            onChange={(e) => set("cargo", e.target.value)}
            disabled={loading}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {CARGOS_SOLICITAVEIS.map((cg) => (
              <option key={cg.id} value={cg.id} style={{ background: c.cardBg, color: c.textColor }}>
                {cg.label}
              </option>
            ))}
          </select>
        </CampoAuth>

        <CampoAuth label="Mensagem para a gestão" icon={MessageSquare} tema={tema} error={erros.mensagem} hint="Opcional. Ex.: obras que você acompanha.">
          <textarea
            value={form.mensagem}
            onChange={(e) => set("mensagem", e.target.value)}
            maxLength={1000}
            rows={3}
            disabled={loading}
            style={{ ...inputStyle, height: "auto", minHeight: 72, padding: "10px 0", resize: "vertical" }}
          />
        </CampoAuth>

        {/* Campo-isca: escondido para pessoas; robôs costumam preencher */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          value={form.website}
          onChange={(e) => set("website", e.target.value)}
          style={{ display: "none" }}
        />

        {erroEnvio && <AvisoAuth>{erroEnvio}</AvisoAuth>}

        <BotaoAuth type="submit" tema={tema} loading={loading} loadingText="Enviando..." icon={Send}>
          Enviar pedido
        </BotaoAuth>

        <LinkAuth tema={tema} muted onClick={onVoltar} style={{ alignSelf: "center" }}>
          Já tenho acesso
        </LinkAuth>
      </form>
    </AuthLayout>
  );
}
