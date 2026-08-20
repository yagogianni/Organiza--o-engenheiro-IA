import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalysisPrompt, buildContinuePrompt, parseJSONResponse } from '../src/services/ai.js';

test('buildAnalysisPrompt embeds all prospect fields', () => {
  const prompt = buildAnalysisPrompt({
    empresa: 'Acme', segmento: 'SaaS', contato: 'Joao', cargo: 'CEO',
    info: 'empresa grande', site: 'acme.com'
  });
  assert.match(prompt, /Acme/);
  assert.match(prompt, /SaaS/);
  assert.match(prompt, /Joao/);
  assert.match(prompt, /CEO/);
  assert.match(prompt, /empresa grande/);
  assert.match(prompt, /acme\.com/);
});

test('buildAnalysisPrompt includes extracted site content when provided', () => {
  const prompt = buildAnalysisPrompt({
    empresa: 'Acme', segmento: 'SaaS', contato: 'Joao', cargo: 'CEO',
    site: 'acme.com', siteContent: 'Especialistas em automação de vendas B2B.'
  });
  assert.match(prompt, /CONTEÚDO DO SITE/);
  assert.match(prompt, /Especialistas em automação de vendas B2B\./);
});

test('buildAnalysisPrompt omits the site content block when not provided', () => {
  const prompt = buildAnalysisPrompt({
    empresa: 'Acme', segmento: 'SaaS', contato: 'Joao', cargo: 'CEO', site: 'acme.com'
  });
  assert.doesNotMatch(prompt, /CONTEÚDO DO SITE/);
});

test('buildAnalysisPrompt handles missing optional fields', () => {
  const prompt = buildAnalysisPrompt({
    empresa: 'Acme', segmento: 'SaaS', contato: 'Joao', cargo: 'CEO'
  });
  assert.match(prompt, /Não fornecido/);
});

test('buildContinuePrompt embeds historico and the new resposta', () => {
  const context = {
    empresa: 'Acme', segmento: 'SaaS', contato: 'Joao', cargo: 'CEO',
    historico: [{ tipo: 'outgoing', data: '2026-01-01', conteudo: 'Oi Joao!' }]
  };
  const prompt = buildContinuePrompt(context, 'Quero saber mais');
  assert.match(prompt, /Oi Joao!/);
  assert.match(prompt, /Quero saber mais/);
});

test('buildContinuePrompt handles an empty historico', () => {
  const context = { empresa: 'Acme', segmento: 'SaaS', contato: 'Joao', cargo: 'CEO', historico: [] };
  const prompt = buildContinuePrompt(context, 'Primeira resposta');
  assert.match(prompt, /sem histórico anterior/);
});

test('parseJSONResponse extracts and validates JSON with all required keys present', () => {
  const text = 'Aqui está a análise: {"a": "1", "b": "2"} obrigado';
  const result = parseJSONResponse(text, ['a', 'b']);
  assert.deepEqual(result, { a: '1', b: '2' });
});

test('parseJSONResponse throws when a required key is missing', () => {
  assert.throws(
    () => parseJSONResponse('{"a": "1"}', ['a', 'b']),
    /Resposta da IA incompleta.*b/
  );
});

test('parseJSONResponse throws when no JSON object is found', () => {
  assert.throws(
    () => parseJSONResponse('sem json nenhum aqui', ['a']),
    /Formato de resposta inválido/
  );
});
