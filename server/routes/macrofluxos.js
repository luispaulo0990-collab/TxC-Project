// server/routes/macrofluxos.js
import { Router } from 'express';
import { macrofluxosRepository } from '../repositories/macrofluxosRepository.js';
import { optionalJwtMiddleware } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(optionalJwtMiddleware);

// GET /api/macrofluxos - Retorna todos os macrofluxos da biblioteca
router.get('/', async (req, res) => {
  try {
    const items = await macrofluxosRepository.getAll();
    res.json(items);
  } catch (err) {
    console.error('Error fetching macrofluxos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/macrofluxos/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await macrofluxosRepository.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Macrofluxo não encontrado' });
    res.json(item);
  } catch (err) {
    console.error('Error fetching macrofluxo:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/macrofluxos
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.body.user_id || null;
    const macroData = req.body;
    if (!macroData.nome) {
      return res.status(400).json({ error: 'Nome do macrofluxo é obrigatório' });
    }
    const saved = await macrofluxosRepository.upsert(macroData, userId);
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating macrofluxo:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/macrofluxos/:id
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.body.user_id || null;
    const macroData = { ...req.body, id: req.params.id };
    const saved = await macrofluxosRepository.upsert(macroData, userId);
    res.json(saved);
  } catch (err) {
    console.error('Error updating macrofluxo:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/macrofluxos/:id
router.delete('/:id', async (req, res) => {
  try {
    await macrofluxosRepository.delete(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('Error deleting macrofluxo:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
