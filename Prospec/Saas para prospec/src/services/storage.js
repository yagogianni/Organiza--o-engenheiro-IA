// src/services/storage.js - Local Storage (JSON5 Files)
import fs from 'fs/promises';
import path from 'path';
import JSON5 from 'json5';
import { generateProspectId, getFormattedTimestamp } from '../utils/id-generator.js';

function getDataDir() {
  return process.env.DATA_DIR || './data';
}

function indexFile() {
  return path.join(getDataDir(), 'prospects.json5');
}

function prospectDir(id) {
  return path.join(getDataDir(), id);
}

function metadataFile(id) {
  return path.join(prospectDir(id), 'metadata.json5');
}

function historyFile(id) {
  return path.join(prospectDir(id), 'history.json5');
}

function analysesFile(id) {
  return path.join(prospectDir(id), 'analyses.json5');
}

async function readJSON5(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON5.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJSON5(filePath, data) {
  await fs.writeFile(filePath, JSON5.stringify(data, null, 2), 'utf-8');
}

/**
 * Verifica se pasta de dados existe e cria se necessário, junto com o índice
 */
export async function initializeDataDir() {
  await fs.mkdir(getDataDir(), { recursive: true });
  const index = await readJSON5(indexFile(), null);
  if (!index) {
    await writeJSON5(indexFile(), { prospects: [] });
  }
}

/**
 * Lê todos os prospects (índice resumido)
 */
export async function getAllProspects() {
  const index = await readJSON5(indexFile(), { prospects: [] });
  return index.prospects;
}

/**
 * Lê todos os prospects já enriquecidos com histórico e análises, para
 * permitir o cálculo do estágio do pipeline na camada de rotas
 */
export async function getAllProspectsWithPipeline() {
  const index = await readJSON5(indexFile(), { prospects: [] });
  return Promise.all(index.prospects.map(async (entry) => {
    const history = await readJSON5(historyFile(entry.id), { messages: [] });
    const analyses = await readJSON5(analysesFile(entry.id), { analyses: [] });
    return { ...entry, historico: history.messages, analises: analyses.analyses };
  }));
}

/**
 * Lê um prospect específico, combinando metadata + histórico + análises
 */
export async function getProspect(id) {
  const metadata = await readJSON5(metadataFile(id), null);
  if (!metadata) {
    throw new Error('PROSPECT_NOT_FOUND');
  }

  const history = await readJSON5(historyFile(id), { messages: [] });
  const analyses = await readJSON5(analysesFile(id), { analyses: [] });

  return {
    id,
    ...metadata,
    historico: history.messages,
    analises: analyses.analyses
  };
}

/**
 * Salva novo prospect: cria pasta, metadata, histórico inicial, primeira
 * análise, e atualiza o índice
 */
export async function saveProspect(prospectData, analysis) {
  const id = generateProspectId();
  const dateCreated = getFormattedTimestamp();

  await fs.mkdir(prospectDir(id), { recursive: true });

  const metadata = {
    empresa: prospectData.empresa,
    segmento: prospectData.segmento,
    contato: prospectData.contato,
    cargo: prospectData.cargo,
    info: prospectData.info || '',
    site: prospectData.site || '',
    status: 'frio',
    dateCreated
  };
  await writeJSON5(metadataFile(id), metadata);

  await writeJSON5(historyFile(id), {
    messages: [{ data: dateCreated, tipo: 'outgoing', conteudo: analysis.mensagem }]
  });

  await writeJSON5(analysesFile(id), {
    analyses: [{ date: dateCreated, ...analysis }]
  });

  const index = await readJSON5(indexFile(), { prospects: [] });
  index.prospects.push({
    id,
    empresa: metadata.empresa,
    contato: metadata.contato,
    cargo: metadata.cargo,
    segmento: metadata.segmento,
    status: metadata.status,
    dateCreated
  });
  await writeJSON5(indexFile(), index);

  return { id, ...metadata };
}

/**
 * Registra a resposta recebida do prospect, a próxima mensagem enviada, e
 * a análise correspondente
 */
export async function addToHistory(id, resposta, analise) {
  const metadata = await readJSON5(metadataFile(id), null);
  if (!metadata) {
    throw new Error('PROSPECT_NOT_FOUND');
  }

  const dateNow = getFormattedTimestamp();

  const history = await readJSON5(historyFile(id), { messages: [] });
  history.messages.push({ data: dateNow, tipo: 'incoming', conteudo: resposta });
  if (analise.proximaMensagem) {
    history.messages.push({ data: dateNow, tipo: 'outgoing', conteudo: analise.proximaMensagem });
  }
  await writeJSON5(historyFile(id), history);

  const analyses = await readJSON5(analysesFile(id), { analyses: [] });
  analyses.analyses.push({ date: dateNow, ...analise });
  await writeJSON5(analysesFile(id), analyses);
}
