import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config();

import {
  getAllProspects,
  getAllProspectsWithPipeline,
  getProspect,
  saveProspect,
  addToHistory,
  deleteProspect
} from '../src/services/storage.js';

const createdLeadIds = [];

async function cleanup() {
  if (createdLeadIds.length === 0) return;
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await client.from('leads').delete().in('id', createdLeadIds);
}

after(cleanup);

test('saveProspect creates a lead, conversation, message, and event; returns the expected shape', async () => {
  const analysis = {
    estagio: 'frio', situacaoAtual: 'x', objetivo: 'y', estrategia: 'z',
    oQueEvitar: 'w', mensagem: 'Oi Ana!', alternativa: 'Oi Ana, de novo!'
  };
  const saved = await saveProspect(
    { empresa: 'Acme', segmento: 'SaaS', contato: 'Ana', cargo: 'CEO', info: 'nota', site: 'acme.com' },
    analysis
  );
  createdLeadIds.push(saved.id);

  assert.ok(saved.id);
  assert.equal(saved.empresa, 'Acme');
  assert.equal(saved.segmento, 'SaaS');
  assert.equal(saved.contato, 'Ana');
  assert.equal(saved.cargo, 'CEO');
  assert.equal(saved.info, 'nota');
  assert.equal(saved.site, 'acme.com');
  assert.ok(saved.dateCreated);
});

test('saveProspect normalizes phone to digits-only with country code', async () => {
  const saved = await saveProspect(
    { empresa: 'Normaliza Telefone', segmento: 'Saúde', contato: 'Teste', cargo: 'Dono', telefone: '51 9898-9889' },
    { estagio: 'frio', mensagem: 'Oi!' }
  );
  createdLeadIds.push(saved.id);

  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await client.from('leads').select('phone').eq('id', saved.id).single();
  assert.equal(data.phone, '555198989889');
});

test('getProspect returns metadata merged with history and analyses', async () => {
  const saved = await saveProspect(
    { empresa: 'Beta', segmento: 'Consultoria', contato: 'Bia', cargo: 'Diretora' },
    { estagio: 'frio', mensagem: 'Oi Bia!' }
  );
  createdLeadIds.push(saved.id);

  const prospect = await getProspect(saved.id);

  assert.equal(prospect.empresa, 'Beta');
  assert.equal(prospect.historico.length, 1);
  assert.equal(prospect.historico[0].tipo, 'outgoing');
  assert.equal(prospect.historico[0].conteudo, 'Oi Bia!');
  assert.equal(prospect.analises.length, 1);
  assert.equal(prospect.analises[0].estagio, 'frio');
});

test('getProspect throws PROSPECT_NOT_FOUND for an unknown id', async () => {
  await assert.rejects(
    () => getProspect('00000000-0000-0000-0000-000000000000'),
    /PROSPECT_NOT_FOUND/
  );
});

test('getProspect throws PROSPECT_NOT_FOUND (not a raw DB error) for a malformed id', async () => {
  await assert.rejects(
    () => getProspect('not-a-valid-uuid'),
    /PROSPECT_NOT_FOUND/
  );
});

test('addToHistory appends the incoming reply, the next message, and the analysis', async () => {
  const saved = await saveProspect(
    { empresa: 'Gamma', segmento: 'Educação', contato: 'Caio', cargo: 'Coord' },
    { estagio: 'frio', mensagem: 'Oi Caio!' }
  );
  createdLeadIds.push(saved.id);

  await addToHistory(saved.id, 'Quero saber mais', {
    estagioAtual: 'interessado',
    proximaMensagem: 'Legal! Posso te mostrar em 10min?'
  });

  const prospect = await getProspect(saved.id);

  assert.equal(prospect.historico.length, 3);
  assert.equal(prospect.historico[0].tipo, 'outgoing');
  assert.equal(prospect.historico[1].tipo, 'incoming');
  assert.equal(prospect.historico[1].conteudo, 'Quero saber mais');
  assert.equal(prospect.historico[2].tipo, 'outgoing');
  assert.equal(prospect.historico[2].conteudo, 'Legal! Posso te mostrar em 10min?');
  assert.equal(prospect.analises.length, 2);
  assert.equal(prospect.analises[1].estagioAtual, 'interessado');
});

test('addToHistory stamps sent_at on the generated message so Motor de Envio never auto-sends it', async () => {
  const saved = await saveProspect(
    { empresa: 'Sem Auto Envio', segmento: 'Educação', contato: 'Duda', cargo: 'Coord' },
    { estagio: 'frio', mensagem: 'Oi Duda!' }
  );
  createdLeadIds.push(saved.id);

  await addToHistory(saved.id, 'Quero saber mais', {
    estagioAtual: 'interessado',
    proximaMensagem: 'Legal! Posso te mostrar?'
  });

  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: conv } = await client.from('conversations').select('id').eq('lead_id', saved.id).single();
  const { data: msgs } = await client.from('messages')
    .select('direction, content, sent_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });

  const proximaMsg = msgs.find(m => m.direction === 'OUTBOUND' && m.content === 'Legal! Posso te mostrar?');
  assert.ok(proximaMsg, 'próxima mensagem deveria ter sido registrada');
  assert.ok(proximaMsg.sent_at, 'sent_at deveria estar preenchido para não entrar na fila do Motor de Envio');
});

test('addToHistory throws PROSPECT_NOT_FOUND for an unknown id', async () => {
  await assert.rejects(
    () => addToHistory('00000000-0000-0000-0000-000000000000', 'oi', {}),
    /PROSPECT_NOT_FOUND/
  );
});

test('deleteProspect removes the lead and its history', async () => {
  const saved = await saveProspect(
    { empresa: 'Zulu', segmento: 'Logística', contato: 'Zeca', cargo: 'Sócio', telefone: '11977776666' },
    { estagio: 'frio', mensagem: 'Oi Zeca!' }
  );

  await deleteProspect(saved.id);

  await assert.rejects(() => getProspect(saved.id), /PROSPECT_NOT_FOUND/);
});

test('deleteProspect throws PROSPECT_NOT_FOUND for an unknown id', async () => {
  await assert.rejects(
    () => deleteProspect('00000000-0000-0000-0000-000000000000'),
    /PROSPECT_NOT_FOUND/
  );
});

test('getAllProspects and getAllProspectsWithPipeline include a saved prospect', async () => {
  const saved = await saveProspect(
    { empresa: 'Delta', segmento: 'Varejo', contato: 'Duda', cargo: 'Sócia' },
    { estagio: 'frio', mensagem: 'Oi Duda!' }
  );
  createdLeadIds.push(saved.id);

  const all = await getAllProspects();
  assert.ok(all.some(p => p.id === saved.id && p.empresa === 'Delta'));

  const withPipeline = await getAllProspectsWithPipeline();
  const entry = withPipeline.find(p => p.id === saved.id);
  assert.ok(entry);
  assert.equal(entry.historico.length, 1);
  assert.equal(entry.analises.length, 1);
});
