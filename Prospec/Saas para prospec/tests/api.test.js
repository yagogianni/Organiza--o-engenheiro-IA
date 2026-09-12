import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import apiRoutes from '../src/routes/api.js';
import { saveProspect } from '../src/services/storage.js';

let server, baseUrl;
const createdLeadIds = [];
let sourcingSettingsSnapshot;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}/api`;

  // A config de sourcing é uma linha só ('default'), compartilhada com o uso
  // real do dashboard - guarda o que já estava configurado antes dos testes
  // pra devolver depois, em vez de simplesmente apagar.
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await client.from('sourcing_settings').select('*').eq('id', 'default').maybeSingle();
  sourcingSettingsSnapshot = data;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (createdLeadIds.length > 0) {
    await client.from('leads').delete().in('id', createdLeadIds);
  }
  if (sourcingSettingsSnapshot) {
    await client.from('sourcing_settings').upsert(sourcingSettingsSnapshot);
  } else {
    await client.from('sourcing_settings').delete().eq('id', 'default');
  }
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

test('GET /prospects returns an array', async () => {
  const res = await fetch(`${baseUrl}/prospects`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
});

test('GET /prospect/:id returns 404 for a well-formed but unknown id', async () => {
  const res = await fetch(`${baseUrl}/prospect/00000000-0000-0000-0000-000000000000`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.match(body.error, /não encontrado/);
});

test('GET /prospect/:id returns 404 (not 500) for a malformed id', async () => {
  const res = await fetch(`${baseUrl}/prospect/not-a-valid-uuid`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.match(body.error, /não encontrado/);
});

test('GET /prospects includes a computed pipeline stage for a created prospect', async () => {
  const saved = await saveProspect(
    { empresa: 'Echo Corp', segmento: 'Educação', contato: 'Rita', cargo: 'Diretora' },
    { mensagem: 'Oi Rita!', estagio: 'frio' }
  );
  createdLeadIds.push(saved.id);

  const res = await fetch(`${baseUrl}/prospects`);
  const body = await res.json();

  const entry = body.find(p => p.id === saved.id);
  assert.ok(entry);
  assert.equal(entry.pipeline.stage, 'abordado');
  assert.equal(entry.historico, undefined);
});

test('GET /prospect/:id includes a computed pipeline stage', async () => {
  const saved = await saveProspect(
    { empresa: 'Foxtrot', segmento: 'Financeiro', contato: 'Caio', cargo: 'CFO' },
    { mensagem: 'Oi Caio!', estagio: 'frio' }
  );
  createdLeadIds.push(saved.id);

  const res = await fetch(`${baseUrl}/prospect/${saved.id}`);
  const body = await res.json();

  assert.equal(body.pipeline.stage, 'abordado');
});

test('GET /sourcing-config returns niches/region/status shape', async () => {
  const res = await fetch(`${baseUrl}/sourcing-config`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.niches));
  assert.equal(typeof body.region, 'string');
  assert.equal(typeof body.leadsToday, 'number');
  assert.equal(body.dailyCap, 10);
});

test('PUT /sourcing-config saves and returns the new niches/region', async () => {
  const res = await fetch(`${baseUrl}/sourcing-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niches: ['dentista', 'clínica'], region: 'Joinville, SC' })
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.niches, ['dentista', 'clínica']);
  assert.equal(body.region, 'Joinville, SC');
});

test('PUT /sourcing-config returns 400 for an empty niche list', async () => {
  const res = await fetch(`${baseUrl}/sourcing-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niches: [], region: 'Joinville, SC' })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /Nichos deve ser uma lista de textos não vazios/);
});
