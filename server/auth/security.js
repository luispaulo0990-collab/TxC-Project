// server/auth/security.js
// Assinatura (HMAC-SHA256) e cifragem (AES-256-GCM) dos dados temporários do login.
import crypto from 'node:crypto';

const secret = () => {
  const s = process.env.SESSION_SECRET?.trim().replace(/^(['"])(.*)\1$/, '$2');
  if (!s || s.length < 16) throw new Error('SESSION_SECRET ausente ou curto demais (mín. 16 caracteres).');
  return s;
};

const hmac = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');
const aesKey = () => crypto.createHash('sha256').update(`txc-handoff:${secret()}`).digest();

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

/** payload: { kind: 'user', sub: string, exp: epoch-seconds } → "payload.assinatura" */
export function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${hmac(body)}`;
}

/** Devolve o payload se a assinatura confere e não expirou; senão null. */
export function verifySession(token) {
  if (typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = hmac(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload.sub !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Cifra um objeto (AES-256-GCM) com validade em segundos. */
export function sealData(obj, ttlSeconds) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey(), iv);
  const plain = JSON.stringify({ d: obj, exp: Math.floor(Date.now() / 1000) + ttlSeconds });
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}

export function openData(sealed) {
  try {
    const [iv, tag, enc] = String(sealed || '').split('.').map((p) => Buffer.from(p, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    const { d, exp } = JSON.parse(plain);
    if (exp < Math.floor(Date.now() / 1000)) return null;
    return d;
  } catch {
    return null;
  }
}

/* ─── Cookies (sem dependência extra) ─────────────────────────── */
export function readCookie(req, name) {
  const raw = req.headers?.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function setCookie(res, name, value, { maxAge, path = '/', secure = false } = {}) {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    'HttpOnly',
    'SameSite=Lax',
    maxAge != null ? `Max-Age=${maxAge}` : null,
    secure ? 'Secure' : null,
  ].filter(Boolean);
  const prev = res.getHeader('Set-Cookie');
  const list = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
  res.setHeader('Set-Cookie', [...list, attrs.join('; ')]);
}

export const clearCookie = (res, name, opts = {}) => setCookie(res, name, '', { ...opts, maxAge: 0 });
