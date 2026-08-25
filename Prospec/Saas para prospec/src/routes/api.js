// src/routes/api.js - API Endpoints
import express from 'express';
import { analyzeNewProspect, continueConversation } from '../services/ai.js';
import { fetchSiteText } from '../services/site-scraper.js';
import { computePipelineStage } from '../services/pipeline.js';
import {
  saveProspect,
  getProspect,
  getAllProspectsWithPipeline,
  addToHistory,
  deleteProspect
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
    const siteContent = req.body.site ? await fetchSiteText(req.body.site) : null;
    const analysis = await analyzeNewProspect({ ...req.body, siteContent });
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
 * Retorna lista de todos os prospects, cada um com o estágio do pipeline
 */
router.get('/prospects', async (req, res) => {
  try {
    const prospects = await getAllProspectsWithPipeline();
    const withPipeline = prospects.map(({ historico, analises, ...rest }) => ({
      ...rest,
      pipeline: computePipelineStage({ historico, analises })
    }));
    res.json(withPipeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prospect/:id
 * Retorna detalhes de um prospect (incluindo histórico e estágio do pipeline)
 */
router.get('/prospect/:id', async (req, res) => {
  try {
    const prospect = await getProspect(req.params.id);
    res.json({ ...prospect, pipeline: computePipelineStage(prospect) });
  } catch (error) {
    if (error.message === 'PROSPECT_NOT_FOUND') {
      return res.status(404).json({ error: 'Prospect não encontrado' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/prospect/:id
 * Remove um lead e todo o histórico relacionado
 */
router.delete('/prospect/:id', async (req, res) => {
  try {
    await deleteProspect(req.params.id);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'PROSPECT_NOT_FOUND') {
      return res.status(404).json({ error: 'Prospect não encontrado' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
