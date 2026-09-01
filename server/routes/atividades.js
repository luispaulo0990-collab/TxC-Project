// server/routes/atividades.js
import { Router } from 'express';
import { atividadesRepository } from '../repositories/atividadesRepository.js';

const router = Router();

// GET all atividades
router.get('/', async (req, res) => {
  try {
    const items = await atividadesRepository.getAll();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await atividadesRepository.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const created = await atividadesRepository.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const updated = await atividadesRepository.update(req.params.id, { ...req.body });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await atividadesRepository.delete(req.params.id);
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
