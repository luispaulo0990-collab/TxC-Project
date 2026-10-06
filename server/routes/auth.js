// server/routes/auth.js
import { Router } from 'express';
import { signup, login } from '../controllers/authController.js';
import { optionalJwtMiddleware } from '../middleware/jwtMiddleware.js';
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

const router = Router();

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
