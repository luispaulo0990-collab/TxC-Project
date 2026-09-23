// server/routes/projetos.js
import { Router } from 'express';
import { projetosRepository } from '../repositories/projetosRepository.js';
import { optionalJwtMiddleware } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(optionalJwtMiddleware);


// GET all projetos
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || null;
    const items = await projetosRepository.getAll(userId);
    res.json(items);
  } catch (err) {
    console.error('Error fetching projetos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET projeto by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || null;
    const item = await projetosRepository.getById(req.params.id, userId);
    if (!item) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(item);
  } catch (err) {
    console.error('Error fetching projeto:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT / POST upsert projeto
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.body.user_id || null;
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

// DELETE projeto
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || null;
    const deleted = await projetosRepository.delete(req.params.id, userId);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error deleting projeto:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

