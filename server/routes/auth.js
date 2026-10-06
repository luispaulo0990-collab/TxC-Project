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

    // 2. Buscar grupos onde o usuário é membro
    let membros = [];
    try {
      const { data: m } = await supabaseAdmin
        .from('grupo_membros')
        .select('role, grupo:grupos(id, nome)')
        .eq('user_id', userId);
      membros = m || [];
    } catch (e) {
      console.warn('Erro ao consultar grupo_membros em auth/me:', e);
    }

    // 3. Checar total de membros registrados no sistema
    let totalMembros = 0;
    try {
      const { count } = await supabaseAdmin
        .from('grupo_membros')
        .select('*', { count: 'exact', head: true });
      totalMembros = count ?? 0;
    } catch {}

    // 4. Determinar role efetivo
    let effectiveRole = (
      profile?.role ||
      req.user?.app_metadata?.role ||
      req.user?.user_metadata?.role ||
      ''
    ).toLowerCase();

    if (membros.length > 0) {
      if (membros.some((item) => item.role?.toLowerCase() === 'dev')) {
        effectiveRole = 'dev';
      } else if (membros.some((item) => item.role?.toLowerCase() === 'admin')) {
        effectiveRole = 'admin';
      }
    }

    // Se o banco ainda não tem grupos criados, liberar acesso mestre para configuração
    if (totalMembros === 0 && (!effectiveRole || effectiveRole === 'member' || effectiveRole === 'authenticated')) {
      effectiveRole = profile?.role === 'admin' ? 'admin' : 'dev';
    }

    if (!effectiveRole || effectiveRole === 'authenticated') {
      effectiveRole = 'member';
    }

    res.json({
      id: userId,
      email: req.user?.email,
      role: effectiveRole,
      profile,
      grupos: membros,
      totalMembrosNoBanco: totalMembros,
    });
  } catch (err) {
    console.error('auth/me error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
