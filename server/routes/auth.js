// server/routes/auth.js
import { Router } from 'express';
import { signup, login } from '../controllers/authController.js';
import { optionalJwtMiddleware } from '../middleware/jwtMiddleware.js';
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

import {
  authMode, entraConfigured, devLoginAllowed, appUrl,
  entraAuthorizeUrl, entraCallback, createSupabaseSession,
} from '../auth/entra.js';
import { sealData, openData, readCookie, setCookie, clearCookie } from '../auth/security.js';

const router = Router();

/* ─── Login Microsoft 365 (Entra ID) ───────────────────────────── */
const STATE_COOKIE = 'txc_entra_state';
const HANDOFF_COOKIE = 'txc_entra_handoff';
const cookieOpts = () => ({ path: '/api/auth', secure: appUrl().startsWith('https://') });
const voltarComErro = (res, msg) =>
  res.redirect(302, `${appUrl()}/?login_erro=${encodeURIComponent(String(msg || 'Falha no login.').slice(0, 200))}`);

// GET /api/auth/config - o que a tela de login deve mostrar
router.get('/config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ mode: authMode(), entraConfigured: entraConfigured(), devLogin: devLoginAllowed() });
});

// GET /api/auth/microsoft/login - 1ª etapa: redireciona para a Microsoft
router.get('/microsoft/login', (_req, res) => {
  try {
    const { url, state } = entraAuthorizeUrl();
    setCookie(res, STATE_COOKIE, state, { ...cookieOpts(), maxAge: 600 });
    res.redirect(302, url);
  } catch (err) {
    voltarComErro(res, err.message);
  }
});

// GET /api/auth/microsoft/callback - 2ª etapa: valida, encontra o usuário e cria a sessão
router.get('/microsoft/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;
  const cookieState = readCookie(req, STATE_COOKIE);
  clearCookie(res, STATE_COOKIE, cookieOpts());

  if (error) {
    const cancelado = error === 'access_denied';
    return voltarComErro(res, cancelado ? 'Login cancelado.' : `A Microsoft recusou o login. ${String(errorDescription || '').split('\r\n')[0]}`);
  }
  if (!code || !state) return voltarComErro(res, 'Retorno de login inválido. Tente de novo.');

  try {
    if (!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)) {
      throw new Error('Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada.');
    }
    const userId = await entraCallback(String(code), String(state), cookieState);
    const tokens = await createSupabaseSession(userId);
    // Os tokens vão cifrados num cookie httpOnly de 2 min e o app os busca uma única vez (nunca pela URL)
    setCookie(res, HANDOFF_COOKIE, sealData(tokens, 120), { ...cookieOpts(), maxAge: 120 });
    return res.redirect(302, `${appUrl()}/?login=microsoft`);
  } catch (err) {
    console.warn('Login Microsoft falhou:', err.message);
    return voltarComErro(res, err.message);
  }
});

// POST /api/auth/microsoft/session - 3ª etapa: o app recebe os tokens da sessão (uso único)
router.post('/microsoft/session', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const sealed = readCookie(req, HANDOFF_COOKIE);
  clearCookie(res, HANDOFF_COOKIE, cookieOpts());
  const tokens = sealed ? openData(sealed) : null;
  if (!tokens?.access_token) return res.status(401).json({ error: 'Login expirado. Tente entrar de novo.' });
  res.json(tokens);
});

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me - Retorna dados, perfil e papel ativo do usuário autenticado
router.get('/me', optionalJwtMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Não autenticado' });

    // 1. Buscar perfil na tabela public.profiles via service_role
    let profile = null;
    try {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      profile = p;
    } catch (e) {
      console.warn('Erro ao consultar profile em auth/me:', e);
    }

    // 2. Determinar role efetivo (profiles.role > token metadata > 'member')
    let effectiveRole = (
      profile?.role ||
      req.user?.app_metadata?.role ||
      req.user?.user_metadata?.role ||
      ''
    ).toLowerCase();

    if (effectiveRole !== 'dev' && effectiveRole !== 'admin') {
      effectiveRole = 'member';
    }

    res.json({
      id: userId,
      email: req.user?.email || profile?.email,
      role: effectiveRole,
      profile,
    });
  } catch (err) {
    console.error('auth/me error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
