// src/utils/authMicrosoft.js
// Front do login com Microsoft 365 (Entra ID). O fluxo OAuth roda no servidor;
// aqui só iniciamos o login e recebemos a sessão Supabase criada por ele.
import { supabasePublic, obterPerfilUsuario } from "./supabaseClient";

const API_BASE_URL = import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, "") : "";
const apiUrl = (path) => `${API_BASE_URL}${path}`;

/** { mode: 'entra'|'dev', entraConfigured, devLogin } — com fallback se o servidor não responder. */
export async function obterConfigLogin() {
  try {
    const res = await fetch(apiUrl("/api/auth/config"), { credentials: "include" });
    if (res.ok) return await res.json();
  } catch {}
  // Sem servidor: em desenvolvimento local libera o e-mail/senha para não travar o uso
  return { mode: "dev", entraConfigured: false, devLogin: !!import.meta.env?.DEV, offline: true };
}

export function iniciarLoginMicrosoft() {
  window.location.assign(apiUrl("/api/auth/microsoft/login"));
}

/** Lê ?login=microsoft / ?login_erro=… da URL e limpa esses parâmetros. */
export function lerRetornoLoginDaUrl() {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const ok = url.searchParams.get("login");
  const erro = url.searchParams.get("login_erro");
  if (!ok && !erro) return null;
  url.searchParams.delete("login");
  url.searchParams.delete("login_erro");
  window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
  return erro ? { erro } : ok === "microsoft" ? { microsoft: true } : null;
}

/** Busca (uma única vez) os tokens gerados no callback e ativa a sessão Supabase. */
export async function concluirLoginMicrosoft() {
  const res = await fetch(apiUrl("/api/auth/microsoft/session"), { method: "POST", credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data.error || "Login expirado. Tente entrar de novo.");

  const { data: sess, error } = await supabasePublic.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error || !sess?.session?.user) throw new Error("Não foi possível iniciar a sessão. Tente de novo.");

  const enriched = await obterPerfilUsuario(sess.session.user);
  sessionStorage.setItem("lob:auth_token", sess.session.access_token);
  sessionStorage.setItem("lob:user", JSON.stringify(enriched));
  return { user: enriched, session: sess.session };
}
