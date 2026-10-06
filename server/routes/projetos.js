// server/routes/projetos.js
import { Router } from 'express';
import { projetosRepository } from '../repositories/projetosRepository.js';
import { optionalJwtMiddleware } from '../middleware/jwtMiddleware.js';
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

const router = Router();
router.use(optionalJwtMiddleware);

/**
 * Obtém o cargo efetivo do usuário: 'dev' | 'admin' | 'member'
 */
async function getUserRole(req, projetoId = null, grupoId = null) {
  const userId = req.user?.sub || req.user?.id;
  if (!userId) {
    return 'member';
  }

  // 1. Metadados do token JWT (auth)
  const metaRole = (req.user?.app_metadata?.role || req.user?.user_metadata?.role || req.user?.role || '').toLowerCase();
  if (metaRole === 'dev') return 'dev';
  if (metaRole === 'admin') return 'admin';

  // 2. Tabela public.profiles
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (profile?.role) {
      const pRole = profile.role.toLowerCase();
      if (pRole === 'dev') return 'dev';
      if (pRole === 'admin') return 'admin';
    }
  } catch {}

  // 3. Papel em grupo específico associado ao projeto
  let gId = grupoId;
  if (!gId && projetoId) {
    try {
      const proj = await projetosRepository.getById(projetoId);
      gId = proj?.grupo_id;
    } catch {}
  }

  if (gId) {
    try {
      const { data: membro } = await supabaseAdmin
        .from('grupo_membros')
        .select('role')
        .eq('grupo_id', gId)
        .eq('user_id', userId)
        .single();
      if (membro?.role) {
        const mRole = membro.role.toLowerCase();
        if (mRole === 'dev') return 'dev';
        if (mRole === 'admin') return 'admin';
      }
    } catch {}
  }

  // 4. Se o usuário tiver cargo 'dev' ou 'admin' em qualquer grupo registrado
  try {
    const { data: membros } = await supabaseAdmin
      .from('grupo_membros')
      .select('role')
      .eq('user_id', userId);
    if (Array.isArray(membros) && membros.length > 0) {
      if (membros.some((m) => m.role?.toLowerCase() === 'dev')) return 'dev';
      if (membros.some((m) => m.role?.toLowerCase() === 'admin')) return 'admin';
    }
  } catch {}

  return 'member';
}

// GET all projetos (Dev, Admin e Membro podem visualizar)
router.get('/', async (req, res) => {
  try {
    const items = await projetosRepository.getAll();
    res.json(items);
  } catch (err) {
    console.error('Error fetching projetos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET projeto by ID (Dev, Admin e Membro podem visualizar)
router.get('/:id', async (req, res) => {
  try {
    const item = await projetosRepository.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(item);
  } catch (err) {
    console.error('Error fetching projeto:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT / POST upsert projeto (Apenas Dev e Admin podem alterar)
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.body.user_id || null;
    const role = await getUserRole(req, req.params.id, req.body.grupo_id);
    
    if (role === 'member') {
      return res.status(403).json({
        error: 'Acesso negado: Perfil de Membro (Visualizador) não tem permissão para alterar obras.',
      });
    }

    const projetoData = { ...req.body, id: req.params.id };
    const saved = await projetosRepository.upsert(projetoData, userId);
    res.json(saved);
  } catch (err) {
    console.error('Error saving projeto:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.body.user_id || null;
    const role = await getUserRole(req, req.body.id, req.body.grupo_id);

    if (role === 'member') {
      return res.status(403).json({
        error: 'Acesso negado: Perfil de Membro (Visualizador) não tem permissão para criar obras.',
      });
    }

    const projetoData = req.body;
    if (!projetoData.id) {
      return res.status(400).json({ error: 'ID do projeto é obrigatório' });
    }
    const saved = await projetosRepository.upsert(projetoData, userId);
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating projeto:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE projeto (EXCLUSIVAMENTE Dev pode apagar obras)
router.delete('/:id', async (req, res) => {
  try {
    const role = await getUserRole(req, req.params.id);

    if (role !== 'dev') {
      return res.status(403).json({
        error: 'Acesso negado: Apenas desenvolvedores (Dev) podem excluir obras.',
      });
    }

    const deleted = await projetosRepository.delete(req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error deleting projeto:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

