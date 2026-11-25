// server/auth/entra.js
// Login com Microsoft 365 (Entra ID) · padrão Unità, adaptado ao TxC (Supabase).
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { randomToken, signSession, verifySession, sealData, openData } from './security.js';
import { supabaseAdmin, supabaseUrl, supabaseAnonKey } from '../../src/utils/supabaseClient.js';

const env = (k) => process.env[k]?.trim().replace(/^(['"])(.*)\1$/, '$2') || null;
export const SESSION_HOURS = 12;

export const authMode = () => (env('AUTH_MODE')?.toLowerCase() === 'entra' ? 'entra' : 'dev');
export const entraConfigured = () => !!(env('ENTRA_TENANT_ID') && env('ENTRA_CLIENT_ID') && env('ENTRA_CLIENT_SECRET'));
export const devLoginAllowed = () => authMode() === 'dev' && process.env.VERCEL_ENV !== 'production';

export const appUrl = () => (env('APP_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
const redirectUri = () => `${appUrl()}/api/auth/microsoft/callback`;
const tenant = () => encodeURIComponent(env('ENTRA_TENANT_ID'));

export function issueSession(userId) {
  const maxAge = SESSION_HOURS * 3600;
  return { value: signSession({ kind: 'user', sub: userId, exp: Math.floor(Date.now() / 1000) + maxAge }), maxAge };
}

/* ─── Acesso aos perfis do app (public.profiles) ─────────────── */
const db = {
  async findUserByEntraOid(oid) {
    const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('entra_oid', oid).maybeSingle();
    if (error) {
      // coluna ainda não criada (migration_entra_login.sql não aplicada): cai para busca por e-mail
      if (!/entra_oid/.test(error.message || '')) console.warn('findUserByEntraOid:', error.message);
      return null;
    }
    return data;
  },
  async findUserByEmail(email) {
    const { data, error } = await supabaseAdmin.from('profiles').select('*').ilike('email', email).limit(1);
    if (error) {
      console.warn('findUserByEmail:', error.message);
      return null;
    }
    return data?.[0] ?? null;
  },
  async updateUser(id, { entraOid, lastLoginAt }) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ entra_oid: entraOid ?? null, last_login_at: lastLoginAt.toISOString() })
      .eq('id', id);
    if (error) console.warn('Não foi possível registrar o login no perfil:', error.message);
  },
};

/** 1ª etapa: URL de login da Microsoft + state assinado (vai também no cookie).
 *  `pedido` (opcional): hash do verificador do iframe, quando o login roda no pop-up do portal. */
export function entraAuthorizeUrl(pedido = null) {
  if (!entraConfigured()) throw new Error('Login Microsoft ainda não configurado (ENTRA_*).');
  if (pedido !== null && !pedidoValido(pedido)) throw new Error('Pedido de login inválido. Tente de novo.');
  const nonce = randomToken(16);
  const state = signSession({
    kind: 'user', sub: `state:${nonce}`, exp: Math.floor(Date.now() / 1000) + 600,
    ...(pedido ? { p: pedido } : {}),
  });
  const q = new URLSearchParams({
    client_id: env('ENTRA_CLIENT_ID'),
    response_type: 'code',
    redirect_uri: redirectUri(),
    response_mode: 'query',
    scope: 'openid profile email',
    state,
    nonce,
    prompt: 'select_account', // sempre mostra a escolha de conta (PC compartilhado / várias contas)
  });
  return { url: `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/authorize?${q}`, state };
}

/** 2ª etapa: valida o retorno, troca o code e devolve o id do usuário do app. */
export async function entraCallback(code, state, cookieState) {
  const st = verifySession(state);
  if (!st || !st.sub.startsWith('state:') || state !== cookieState) throw new Error('Login expirado. Tente entrar de novo.');

  const res = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('ENTRA_CLIENT_ID'),
      client_secret: env('ENTRA_CLIENT_SECRET'),
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      scope: 'openid profile email',
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) throw new Error(`A Microsoft recusou o login. ${data.error_description?.split('\r\n')[0] ?? ''}`.trim());

  // id_token veio direto do endpoint de token (TLS + client secret): basta ler as claims
  const claims = JSON.parse(Buffer.from(data.id_token.split('.')[1] ?? '', 'base64url').toString('utf8'));
  if (claims.tid && claims.tid !== env('ENTRA_TENANT_ID')) throw new Error('Conta de outra organização.');
  if (claims.nonce !== st.sub.slice('state:'.length)) throw new Error('Login inválido. Tente de novo.');

  const email = (claims.email ?? claims.preferred_username ?? '').toLowerCase();
  // busca por oid; se não achar, por e-mail
  const user = (claims.oid && (await db.findUserByEntraOid(claims.oid))) || (email && (await db.findUserByEmail(email))) || null;
  if (!user || user.active === false) throw new Error('Seu usuário ainda não tem acesso. Peça a liberação a quem administra o app.');

  await db.updateUser(user.id, { entraOid: claims.oid ?? user.entra_oid, lastLoginAt: new Date() });
  return user.id;
}

/**
 * 3ª etapa (TxC): cria uma sessão Supabase real para o usuário do app,
 * para que RLS, cargos e o acesso direto do front continuem funcionando.
 * Usa um link mágico gerado e confirmado no próprio servidor (nenhum e-mail é enviado).
 */
export async function createSupabaseSession(userId) {
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = authData?.user?.email;
  if (authErr || !email) throw new Error('Usuário do app sem conta de acesso vinculada. Peça a liberação a quem administra o app.');

  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) throw new Error('Não foi possível iniciar a sessão. Tente de novo.');

  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: verified, error: verifyErr } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  const session = verified?.session;
  if (verifyErr || !session?.access_token) throw new Error('Não foi possível iniciar a sessão. Tente de novo.');

  return { access_token: session.access_token, refresh_token: session.refresh_token };
}

/* ─── Login em pop-up (app dentro do iframe do Portal Unità) ─────────────
 * O iframe sorteia um verificador e entrega ao pop-up só o hash dele (o pedido).
 * O callback guarda o resultado (cifrado) com o nome do pedido em public.login_pedidos;
 * o iframe resgata uma única vez apresentando o verificador. Quem não tem o
 * verificador não resgata a sessão. */
const VALIDADE_PEDIDO_S = 600;

export const pedidoValido = (pedido) => typeof pedido === 'string' && /^[0-9a-f]{64}$/.test(pedido);

/** Pedido gravado no state assinado (ou null, no login em aba própria). */
export function pedidoDoState(state) {
  const st = verifySession(String(state || ''));
  return st && pedidoValido(st.p) ? st.p : null;
}

export async function guardarPedido(pedido, resultado) {
  const { error } = await supabaseAdmin.from('login_pedidos').upsert({
    pedido,
    resultado: sealData(resultado, VALIDADE_PEDIDO_S),
    expira_em: new Date(Date.now() + VALIDADE_PEDIDO_S * 1000).toISOString(),
  }, { onConflict: 'pedido' });
  if (error) throw new Error('Não foi possível concluir o login (pedido). Tente de novo.');
}

/** { pendente: true } enquanto o pop-up não terminou; depois { tokens } ou { erro } (uma única vez). */
export async function resgatarPedido(verificador) {
  if (typeof verificador !== 'string' || verificador.length < 32 || verificador.length > 128) {
    return { erro: 'Pedido de login inválido.' };
  }
  const pedido = crypto.createHash('sha256').update(verificador).digest('hex');
  // limpeza oportunista de pedidos vencidos
  supabaseAdmin.from('login_pedidos').delete().lt('expira_em', new Date().toISOString()).then(() => {}, () => {});

  const { data, error } = await supabaseAdmin.from('login_pedidos').delete().eq('pedido', pedido).select('resultado');
  if (error) return { erro: 'Não foi possível concluir o login. Tente de novo.' };
  const linha = data?.[0];
  if (!linha) return { pendente: true };
  const resultado = openData(linha.resultado);
  if (!resultado) return { erro: 'Login expirado. Tente entrar de novo.' };
  return resultado;
}
