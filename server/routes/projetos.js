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
async function getUserRole(req) {
  const userId = req.user?.sub || req.user?.id;
  if (!userId) {
    return 'member';
  }

  // 1. Tabela public.profiles (fonte oficial)
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.role) {
      const pRole = profile.role.toLowerCase();
      if (pRole === 'dev') return 'dev';
      if (pRole === 'admin') return 'admin';
      if (pRole === 'member') return 'member';
    }
  } catch (err) {
    console.warn('Erro ao consultar profile em getUserRole:', err);
  }

  // 2. Metadados do token JWT (auth)
  const metaRole = (req.user?.app_metadata?.role || req.user?.user_metadata?.role || req.user?.role || '').toLowerCase();
  if (metaRole === 'dev') return 'dev';
  if (metaRole === 'admin') return 'admin';

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
    const role = await getUserRole(req);
    
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
    const role = await getUserRole(req);

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

