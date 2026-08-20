import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  initializeDataDir,
  saveProspect,
  getProspect,
  getAllProspects,
  addToHistory
} from '../src/services/storage.js';

let tmpDir;

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prospec-storage-test-'));
  process.env.DATA_DIR = tmpDir;
});

after(async () => {
  delete process.env.DATA_DIR;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('initializeDataDir creates the data dir and an empty index', async () => {
  await initializeDataDir();
  const prospects = await getAllProspects();
  assert.deepEqual(prospects, []);
});

test('saveProspect persists metadata, history, analyses, and updates the index', async () => {
  const analysis = {
    situacaoAtual: 'x', objetivo: 'y', estrategia: 'z',
    oQueEvitar: 'w', mensagem: 'Oi Joao!', alternativa: 'Oi Joao, de novo!'
  };
  const saved = await saveProspect(
    { empresa: 'Acme', segmento: 'SaaS', contato: 'Joao', cargo: 'CEO' },
    analysis
  );

  assert.match(saved.id, /^prosp_/);
  assert.equal(saved.status, 'frio');

  const all = await getAllProspects();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, saved.id);
  assert.equal(all[0].empresa, 'Acme');
});

test('getProspect returns metadata merged with history and analyses', async () => {
  const saved = await saveProspect(
    { empresa: 'Beta', segmento: 'Consultoria', contato: 'Maria', cargo: 'Diretora' },
    { mensagem: 'Oi Maria!' }
  );

  const prospect = await getProspect(saved.id);

  assert.equal(prospect.empresa, 'Beta');
  assert.equal(prospect.historico.length, 1);
  assert.equal(prospect.historico[0].tipo, 'outgoing');
  assert.equal(prospect.historico[0].conteudo, 'Oi Maria!');
  assert.equal(prospect.analises.length, 1);
});

test('getProspect throws PROSPECT_NOT_FOUND for an unknown id', async () => {
  await assert.rejects(() => getProspect('prosp_does_not_exist'), /PROSPECT_NOT_FOUND/);
});

test('addToHistory appends the incoming reply, the next message, and the analysis', async () => {
  const saved = await saveProspect(
    { empresa: 'Gamma', segmento: 'Educação', contato: 'Ana', cargo: 'Coord' },
    { mensagem: 'Oi Ana!' }
  );

  await addToHistory(saved.id, 'Quero saber mais', {
    proximaMensagem: 'Legal! Posso te mostrar em 10min?',
    ondeEstamos: 'Frio → Curioso'
  });

  const prospect = await getProspect(saved.id);

  assert.equal(prospect.historico.length, 3);
  assert.equal(prospect.historico[0].tipo, 'outgoing');
  assert.equal(prospect.historico[1].tipo, 'incoming');
  assert.equal(prospect.historico[1].conteudo, 'Quero saber mais');
  assert.equal(prospect.historico[2].tipo, 'outgoing');
  assert.equal(prospect.historico[2].conteudo, 'Legal! Posso te mostrar em 10min?');
  assert.equal(prospect.analises.length, 2);
});

test('addToHistory throws PROSPECT_NOT_FOUND for an unknown id', async () => {
  await assert.rejects(
    () => addToHistory('prosp_does_not_exist', 'oi', {}),
    /PROSPECT_NOT_FOUND/
  );
});
