import { createClient } from "@supabase/supabase-js";

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

// Cliente público para o frontend com sessionStorage (preserva token para queries do PostgREST e limpa ao fechar a aba)
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

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
    let { data: profile } = await supabasePublic
      .from("profiles")
      .select("id, email, nome, role")
      .eq("id", authUser.id)
      .maybeSingle();

    // 2. Fallback: buscar por email caso o ID no auth não bata diretamente
    if (!profile && authUser.email) {
      const { data: profileEmail } = await supabasePublic
        .from("profiles")
        .select("id, email, nome, role")
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

    const normalizedRole =
      rawRole === "dev" || rawRole === "admin" || rawRole === "member"
        ? rawRole
        : "member";

    const enriched = {
      ...authUser,
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


