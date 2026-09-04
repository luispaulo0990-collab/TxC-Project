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

// Cliente público para o frontend - persistSession: false exige novo login a cada acesso/abertura de link
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
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

// Cliente administrativo para backend / scripts (opcional)
const supabaseServiceRoleKey =
  typeof process !== "undefined" && (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SECRET_KEY)
    ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    : "";

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabasePublic;
