import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import express from 'express';
import apiRoutes from '../src/routes/api.js';
import { initializeDataDir, saveProspect } from '../src/services/storage.js';

let server, baseUrl, tmpDir;

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prospec-api-test-'));
  process.env.DATA_DIR = tmpDir;
  await initializeDataDir();

  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  delete process.env.DATA_DIR;
  await new Promise(resolve => server.close(resolve));
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('POST /analyze returns 400 when required fields are missing', async () => {
  const res = await fetch(`${baseUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empresa: '' })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /Validação falhou/);
});

test('POST /continue returns 400 when resposta is missing', async () => {
  const res = await fetch(`${baseUrl}/continue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'prosp_x' })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /Resposta do prospect é obrigatória/);
});

test('GET /prospects returns an empty array when no prospects exist', async () => {
  const res = await fetch(`${baseUrl}/prospects`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, []);
});

test('GET /prospect/:id returns 404 for an unknown id', async () => {
  const res = await fetch(`${baseUrl}/prospect/prosp_does_not_exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.match(body.error, /não encontrado/);
});

test('GET /prospects includes a computed pipeline stage for each prospect', async () => {
  await saveProspect(
    { empresa: 'Echo Corp', segmento: 'Educação', contato: 'Rita', cargo: 'Diretora' },
    { mensagem: 'Oi Rita!', estagio: 'frio' }
  );

  const res = await fetch(`${baseUrl}/prospects`);
  const body = await res.json();

  assert.equal(body.length, 1);
  assert.equal(body[0].pipeline.stage, 'abordado');
  assert.equal(body[0].historico, undefined);
});

test('GET /prospect/:id includes a computed pipeline stage', async () => {
  const saved = await saveProspect(
    { empresa: 'Foxtrot', segmento: 'Financeiro', contato: 'Caio', cargo: 'CFO' },
    { mensagem: 'Oi Caio!', estagio: 'frio' }
  );

  const res = await fetch(`${baseUrl}/prospect/${saved.id}`);
  const body = await res.json();

  assert.equal(body.pipeline.stage, 'abordado');
});
