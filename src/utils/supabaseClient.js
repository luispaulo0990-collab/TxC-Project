import { createClient } from "@supabase/supabase-js";
import { ROTA_REDEFINIR_SENHA } from "../constants/acesso.js";

// Helper para ler variáveis em ambiente Vite (browser) ou Node.js (server)
const getEnv = (key, viteKey) => {
  if (typeof import.meta !== "undefined" && import.meta.env && viteKey && import.meta.env[viteKey]) {
    return import.meta.env[viteKey];
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return "";
};

const supabaseUrl =
  getEnv("SUPABASE_URL", "VITE_SUPABASE_URL") ||
  "https://wlvrsjgceqpdbzbqaxqz.supabase.co";

const supabaseAnonKey =
  getEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY") ||
  getEnv("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY") ||
  "sb_publishable_BfHPuR4pQCnoMuAFFe_53g_sUbDt-2P";

// Link de convite ou de "esqueci minha senha": a pessoa precisa definir a senha antes de usar o app.
// Lido antes de o Supabase consumir o "#…type=invite" da URL.
// "invite" | "recovery" | null
export const tipoLinkSenhaInicial =
  (typeof window !== "undefined" && window.location.hash.match(/[#&]type=(invite|recovery)\b/)?.[1]) || null;

// Cliente público para o frontend com sessionStorage (preserva token para queries do PostgREST e limpa ao fechar a aba)
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
    autoRefreshToken: true,
    // Abre a sessão a partir do link de convite / redefinição de senha
    detectSessionInUrl: true,
  },
});

/** Mensagens do Supabase Auth em português. */
export const traduzirErroAuth = (err) => {
  const msg = err?.message || "";
  if (/invalid login credentials/i.test(msg)) return "Email ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "E-mail ainda não confirmado. Peça à gestão para confirmar seu usuário.";
  if (/rate limit|too many/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/same.*password|different from the old/i.test(msg)) return "A nova senha precisa ser diferente da atual.";
  if (/fetch|network/i.test(msg)) return "Sem conexão com o servidor de login. Verifique a internet.";
  return msg || "Erro ao conectar com o Supabase.";
};

// Métodos de autenticação auxiliares
export const loginComEmail = async (email, password) => {
  const { data, error } = await supabasePublic.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  try {
    await supabasePublic.auth.signOut();
  } catch {}
  if (typeof window !== "undefined") {
    localStorage.removeItem("lob:auth_token");
    localStorage.removeItem("lob:user");
    sessionStorage.clear();
  }
};

/** Envia o link de "esqueci minha senha"; o link abre a tela de nova senha. */
export const enviarLinkRedefinicaoSenha = async (email) => {
  const { error } = await supabasePublic.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}${ROTA_REDEFINIR_SENHA}`,
  });
  if (error) throw new Error(traduzirErroAuth(error));
};

/** Define a senha da sessão aberta pelo link de convite ou de redefinição. */
export const atualizarSenha = async (password) => {
  const { data, error } = await supabasePublic.auth.updateUser({ password });
  if (error) throw new Error(traduzirErroAuth(error));
  return data?.user || null;
};

const ERROS_SOLICITACAO = {
  NOME_INVALIDO: "Informe o nome completo.",
  EMAIL_INVALIDO: "Informe um e-mail válido.",
  EMAIL_NAO_CORPORATIVO: "Use seu e-mail corporativo.",
  CARGO_INVALIDO: "Escolha um perfil válido.",
  MENSAGEM_LONGA: "A mensagem pode ter até 1000 caracteres.",
};

/**
 * Pedido de acesso (não cria conta): vai para a tabela access_requests,
 * onde a gestão aprova e convida o e-mail.
 */
export const solicitarAcesso = async ({ nome, email, cargo, mensagem }) => {
  const { error } = await supabasePublic.rpc("solicitar_acesso", {
    p_nome: nome.trim(),
    p_email: email.trim().toLowerCase(),
    p_cargo: cargo,
    p_mensagem: mensagem?.trim() || null,
  });
  if (!error) return;
  const codigo = Object.keys(ERROS_SOLICITACAO).find((c) => error.message?.includes(c));
  if (codigo) throw new Error(ERROS_SOLICITACAO[codigo]);
  if (error.code === "PGRST202" || /solicitar_acesso/.test(error.message || "")) {
    throw new Error("Solicitação de acesso indisponível no momento. Avise a gestão.");
  }
  throw new Error(traduzirErroAuth(error));
};

export const obterSessao = async () => {
  const { data, error } = await supabasePublic.auth.getSession();
  if (error) return null;
  return data?.session || null;
};

export const obterUsuarioAtual = async () => {
  const { data, error } = await supabasePublic.auth.getUser();
  if (error) return null;
  return data?.user || null;
};

/**
 * Busca e sincroniza o perfil do usuário na tabela public.profiles do Supabase.
 * Retorna o objeto de usuário enriquecido com o papel correto ('dev' | 'admin' | 'member').
 */
export const obterPerfilUsuario = async (authUser) => {
  if (!authUser || !authUser.id) return authUser;
  try {
    // 1. Buscar na tabela public.profiles pelo ID (UUID)
    // "*" para funcionar antes e depois da coluna active (migration_solicitacao_acesso.sql)
    let { data: profile } = await supabasePublic
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    // 2. Fallback: buscar por email caso o ID no auth não bata diretamente
    if (!profile && authUser.email) {
      const { data: profileEmail } = await supabasePublic
        .from("profiles")
        .select("*")
        .ilike("email", authUser.email.trim())
        .maybeSingle();
      profile = profileEmail;
    }

    // 3. Normalizar o papel (role)
    const rawRole = (
      profile?.role ||
      authUser.app_metadata?.role ||
      authUser.user_metadata?.role ||
      (authUser.role !== "authenticated" ? authUser.role : "") ||
      ""
    ).toString().trim().toLowerCase();

    // Login válido, mas o acesso ainda não foi liberado pela gestão (profiles.active = false)
    const inativo = profile?.active === false;

    const normalizedRole =
      !inativo && (rawRole === "dev" || rawRole === "admin" || rawRole === "member")
        ? rawRole
        : "member";

    const enriched = {
      ...authUser,
      inativo,
      role: normalizedRole,
      perfil: profile || {
        role: normalizedRole,
        nome: authUser.user_metadata?.nome || authUser.email?.split("@")[0],
      },
      profile: profile || {
        role: normalizedRole,
        nome: authUser.user_metadata?.nome || authUser.email?.split("@")[0],
      },
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("lob:user", JSON.stringify(enriched));
    }

    return enriched;
  } catch (err) {
    console.warn("Erro ao buscar perfil do usuário no Supabase:", err);
    return authUser;
  }
};

// Cliente administrativo para backend / serverless (se configurado no ambiente)
const supabaseServiceRoleKey =
  typeof process !== "undefined"
    ? process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SECRET_KEY || ""
    : "";

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabasePublic;


