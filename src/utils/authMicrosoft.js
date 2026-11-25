// src/utils/authMicrosoft.js
// Front do login com Microsoft 365 (Entra ID). O fluxo OAuth roda no servidor;
// aqui só iniciamos o login e recebemos a sessão Supabase criada por ele.
import { supabasePublic, obterPerfilUsuario } from "./supabaseClient";

// O login roda SEMPRE no mesmo endereço do app (não usa VITE_API_URL): a redirect URI
// cadastrada no Entra e os cookies temporários do login pertencem a esse endereço.
const apiUrl = (path) => path;

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

/** Ativa no app a sessão Supabase criada pelo servidor. */
async function ativarSessao(tokens) {
  const { data: sess, error } = await supabasePublic.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error || !sess?.session?.user) throw new Error("Não foi possível iniciar a sessão. Tente de novo.");

  const enriched = await obterPerfilUsuario(sess.session.user);
  sessionStorage.setItem("lob:auth_token", sess.session.access_token);
  sessionStorage.setItem("lob:user", JSON.stringify(enriched));
  return { user: enriched, session: sess.session };
}

/** Busca (uma única vez) os tokens gerados no callback e ativa a sessão Supabase. */
export async function concluirLoginMicrosoft() {
  const res = await fetch(apiUrl("/api/auth/microsoft/session"), { method: "POST", credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data.error || "Login expirado. Tente entrar de novo.");
  return ativarSessao(data);
}

/* ─── Login em pop-up: app dentro do iframe do Portal Unità ───────────────
 * A Microsoft não abre dentro de iframe. O iframe abre um pop-up do próprio app
 * (?login-microsoft=popup), sorteia um verificador e entrega ao pop-up só o hash
 * dele (o pedido), por postMessage com a origem conferida nos dois sentidos.
 * O pop-up segue para a Microsoft; o iframe pergunta ao servidor, com o
 * verificador, se o login terminou (/api/auth/microsoft/concluir). */
const PRONTO = "login-microsoft:pronto";
const PEDIDO = "login-microsoft:pedido";
const INTERVALO_MS = 2000;
const LIMITE_MS = 10 * 60 * 1000;

export function dentroDeIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Modo da página atual quando ela é o pop-up de login: "popup" | "fim" | null. */
export function modoPopupLogin() {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("login-microsoft");
  return v === "popup" || v === "fim" ? v : null;
}

const base64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sha256Hex(texto) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
  return [...hash].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Clique em "Entrar com Microsoft" dentro do iframe. Deve ser chamada direto no clique
 * (o pop-up abre antes de qualquer await, senão o navegador bloqueia).
 * Resolve com { user, session }; resolve null se `cancelado()` ficar verdadeiro; rejeita com a mensagem de erro.
 */
export async function entrarComMicrosoftPopup({ cancelado = () => false } = {}) {
  const popup = window.open(
    `${window.location.pathname}?login-microsoft=popup`,
    "txc-login-microsoft",
    "popup,width=520,height=700"
  );
  if (!popup) throw new Error("O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.");

  const verificador = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const pedido = sha256Hex(verificador);
  const aoReceber = async (e) => {
    if (e.origin !== window.location.origin || e.source !== popup || e.data?.tipo !== PRONTO) return;
    popup.postMessage({ tipo: PEDIDO, pedido: await pedido }, window.location.origin);
  };
  window.addEventListener("message", aoReceber);

  try {
    const limite = Date.now() + LIMITE_MS;
    let fechadoDesde = 0;
    while (Date.now() < limite) {
      await esperar(INTERVALO_MS);
      if (cancelado()) return null;

      const res = await fetch(apiUrl("/api/auth/microsoft/concluir"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificador }),
      }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (res && res.ok && data.access_token) return ativarSessao(data);
      if (res && !res.ok && data.error) throw new Error(data.error);

      // janela fechada sem concluir: dá alguns segundos para o servidor gravar o resultado
      let fechado = false;
      try { fechado = popup.closed; } catch {}
      if (fechado) {
        fechadoDesde = fechadoDesde || Date.now();
        if (Date.now() - fechadoDesde > 6000) throw new Error("A janela de login foi fechada antes de concluir.");
      }
    }
    throw new Error("O login não foi concluído a tempo. Tente de novo.");
  } finally {
    window.removeEventListener("message", aoReceber);
  }
}

/**
 * Executado no pop-up (?login-microsoft=popup): avisa o iframe que está pronto, recebe o pedido
 * (só do próprio app que o abriu) e segue para a Microsoft.
 */
export function prepararPopupLogin() {
  return new Promise((resolve, reject) => {
    const origem = window.opener;
    if (!origem) {
      reject(new Error('Abra o login pelo botão "Entrar com Microsoft" do app.'));
      return;
    }
    let aviso = 0;
    let limite = 0;
    const encerrar = () => {
      clearInterval(aviso);
      clearTimeout(limite);
      window.removeEventListener("message", aoReceber);
    };
    const aoReceber = (e) => {
      if (e.origin !== window.location.origin || e.source !== origem || e.data?.tipo !== PEDIDO) return;
      if (!/^[0-9a-f]{64}$/.test(String(e.data.pedido || ""))) return;
      encerrar();
      resolve();
      window.location.assign(apiUrl(`/api/auth/microsoft/login?pedido=${e.data.pedido}`));
    };
    window.addEventListener("message", aoReceber);
    const avisar = () => {
      try {
        origem.postMessage({ tipo: PRONTO }, window.location.origin); // só chega se quem abriu é o próprio app
      } catch { /* janela de origem fechada */ }
    };
    avisar();
    aviso = setInterval(avisar, 500);
    limite = setTimeout(() => {
      encerrar();
      reject(new Error("Não foi possível falar com o app no portal. Feche esta janela e tente de novo."));
    }, 10_000);
  });
}
