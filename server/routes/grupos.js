// server/routes/grupos.js
import { Router } from 'express';
import { gruposRepository } from '../repositories/gruposRepository.js';

const router = Router();

/** Verifica se o usuário logado é admin do grupo especificado */
async function assertAdmin(grupoId, userId, res) {
  const role = await gruposRepository.getRoleNoGrupo(grupoId, userId);
  if (role !== 'admin') {
    res.status(403).json({ error: 'Apenas admins podem realizar esta ação.' });
    return false;
  }
  return true;
}

// ─── GET /api/grupos ─── lista grupos do usuário logado
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    const grupos = await gruposRepository.getMeusGrupos(userId);
    res.json(grupos);
  } catch (err) {
    console.error('grupos.getAll:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/grupos ─── cria novo grupo (qualquer usuário autenticado vira admin)
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    const { nome } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome do grupo é obrigatório.' });
    const grupo = await gruposRepository.criarGrupo(nome.trim(), userId);
    res.status(201).json(grupo);
  } catch (err) {
    console.error('grupos.criar:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/grupos/:id/membros ─── adiciona membro por email (apenas admin)
router.post('/:id/membros', async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    if (!(await assertAdmin(req.params.id, userId, res))) return;

    const { email, role = 'member' } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Email é obrigatório.' });
    if (!['admin', 'dev', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Papel inválido. Use: admin, dev ou member.' });
    }

    const membro = await gruposRepository.adicionarMembro(req.params.id, email.trim(), role);
    res.status(201).json(membro);
  } catch (err) {
    console.error('grupos.adicionarMembro:', err);
    res.status(err.message.includes('não encontrado') ? 404 : 500).json({ error: err.message });
  }
});

// ─── PUT /api/grupos/:id/membros/:userId/role ─── altera papel (apenas admin)
router.put('/:id/membros/:userId/role', async (req, res) => {
  try {
    const adminId = req.user?.sub;
    if (!adminId) return res.status(401).json({ error: 'Não autenticado.' });
    if (!(await assertAdmin(req.params.id, adminId, res))) return;

    const { role } = req.body;
    if (!['admin', 'dev', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Papel inválido. Use: admin, dev ou member.' });
    }
    const membro = await gruposRepository.alterarRole(req.params.id, req.params.userId, role);
    res.json(membro);
  } catch (err) {
    console.error('grupos.alterarRole:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/grupos/:id/membros/:userId ─── remove membro (apenas admin)
router.delete('/:id/membros/:userId', async (req, res) => {
  try {
    const adminId = req.user?.sub;
    if (!adminId) return res.status(401).json({ error: 'Não autenticado.' });
    // Admin pode remover outros; usuário pode remover a si mesmo
    const isSelf = adminId === req.params.userId;
    if (!isSelf && !(await assertAdmin(req.params.id, adminId, res))) return;

    const removed = await gruposRepository.removerMembro(req.params.id, req.params.userId);
    res.json({ success: true, removed });
  } catch (err) {
    console.error('grupos.removerMembro:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/grupos/:id ─── deleta grupo (apenas admin/criador)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    const result = await gruposRepository.deletarGrupo(req.params.id, userId);
    res.json(result);
  } catch (err) {
    console.error('grupos.deletar:', err);
    res.status(err.message.includes('Apenas admins') ? 403 : 500).json({ error: err.message });
  }
});

export default router;
