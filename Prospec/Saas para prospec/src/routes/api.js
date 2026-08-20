// src/routes/api.js - API Endpoints
import express from 'express';
import { analyzeNewProspect, continueConversation } from '../services/ai.js';
import {
  saveProspect,
  getProspect,
  getAllProspects,
  addToHistory
} from '../services/storage.js';
import { validateNewProspect, validateContinueInput } from '../utils/validators.js';

const router = express.Router();

/**
 * POST /api/analyze
 * Analisa novo prospect e retorna recomendações + mensagem
 */
router.post('/analyze', async (req, res) => {
  try {
    validateNewProspect(req.body);
    const analysis = await analyzeNewProspect(req.body);
    const saved = await saveProspect(req.body, analysis);
    res.json({ ...saved, ...analysis });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/continue
 * Continua conversa com base em resposta do prospect
 */
router.post('/continue', async (req, res) => {
  try {
    validateContinueInput(req.body);
    const { id, resposta } = req.body;
    const prospect = await getProspect(id);
    const analysis = await continueConversation(prospect, resposta);
    await addToHistory(id, resposta, analysis);
    res.json(analysis);
  } catch (error) {
    if (error.message === 'PROSPECT_NOT_FOUND') {
      return res.status(404).json({ error: 'Prospect não encontrado' });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/prospects
 * Retorna lista de todos os prospects
 */
router.get('/prospects', async (req, res) => {
  try {
    const prospects = await getAllProspects();
    res.json(prospects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prospect/:id
 * Retorna detalhes de um prospect (incluindo histórico)
 */
router.get('/prospect/:id', async (req, res) => {
  try {
    const prospect = await getProspect(req.params.id);
    res.json(prospect);
  } catch (error) {
    if (error.message === 'PROSPECT_NOT_FOUND') {
      return res.status(404).json({ error: 'Prospect não encontrado' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
