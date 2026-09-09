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
  deleteProspect,
  recordSentMessage,
  getSourcingConfig,
  saveSourcingConfig
} from '../services/storage.js';
import { sendWhatsAppMessage } from '../services/sender.js';
import { validateNewProspect, validateContinueInput } from '../utils/validators.js';
import { N8N_API_URL } from '../config.js';

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
 * POST /api/prospect/:id/send
 * Manda uma mensagem de WhatsApp DE VERDADE (via Evolution API) direto do
 * dashboard - sem precisar copiar/colar manualmente.
 * Ação humana deliberada (clique no botão), por isso não é bloqueada por
 * automation_enabled=false - pelo contrário, é exatamente o caminho previsto
 * pro humano assumir a conversa (Workflow 5, HUMAN_REVIEW).
 */
router.post('/prospect/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;

    if (!mensagem || typeof mensagem !== 'string' || !mensagem.trim()) {
      return res.status(400).json({ error: 'Mensagem obrigatória' });
    }

    const prospect = await getProspect(id);

    if (!prospect.telefone) {
      return res.status(400).json({ error: 'Lead não tem telefone/WhatsApp cadastrado' });
    }

    await sendWhatsAppMessage(prospect.telefone, mensagem);
    await recordSentMessage(id, mensagem, 'whatsapp');
    res.json({ success: true, channel: 'whatsapp' });
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

/**
 * GET /api/sourcing-config
 * Retorna a configuração da prospecção automática (nichos, região) e o
 * resumo de hoje (nicho da vez, quantos leads entraram hoje)
 */
router.get('/sourcing-config', async (req, res) => {
  try {
    const config = await getSourcingConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/sourcing-config
 * Salva os nichos ativos e a região da prospecção automática
 */
router.put('/sourcing-config', async (req, res) => {
  try {
    const saved = await saveSourcingConfig(req.body);
    res.json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/sourcing-config/buscar-agora
 * Dispara o band de sourcing automático do n8n sob demanda, via o webhook
 * dedicado pra isso - reaproveita exatamente a mesma lógica do ciclo
 * diário, só que na hora em vez de esperar o schedule trigger.
 */
router.post('/sourcing-config/buscar-agora', async (req, res) => {
  try {
    if (!N8N_API_URL) {
      return res.status(500).json({ error: 'N8N_API_URL não configurada' });
    }
    const response = await fetch(`${N8N_API_URL}/webhook/sourcing-buscar-agora`, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`n8n retornou ${response.status}`);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
