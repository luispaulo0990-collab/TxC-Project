// server/routes/projetos.js
import { Router } from 'express';
import { projetosRepository } from '../repositories/projetosRepository.js';

const router = Router();

// GET all projetos
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.sub || null;
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
    const item = await projetosRepository.getById(req.params.id);
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
    const userId = req.user?.sub || null;
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
    const userId = req.user?.sub || null;
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
    const deleted = await projetosRepository.delete(req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error deleting projeto:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
