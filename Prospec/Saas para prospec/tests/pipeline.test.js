import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePipelineStage } from '../src/services/pipeline.js';

function outgoing(n) {
  return Array.from({ length: n }, (_, i) => ({
    data: `2026-01-0${i + 1}`, tipo: 'outgoing', conteudo: `msg ${i + 1}`
  }));
}

test('computePipelineStage returns abordado for a single outgoing message with no reply', () => {
  const result = computePipelineStage({ historico: outgoing(1), analises: [] });
  assert.equal(result.stage, 'abordado');
  assert.equal(result.followUpCount, 1);
  assert.equal(result.label, 'Abordado');
});

test('computePipelineStage returns em_followup for 2-5 outgoing messages with no reply', () => {
  for (const n of [2, 3, 4, 5]) {
    const result = computePipelineStage({ historico: outgoing(n), analises: [] });
    assert.equal(result.stage, 'em_followup');
    assert.equal(result.followUpCount, n);
    assert.equal(result.label, `Em Follow-up (${n}/5)`);
  }
});

test('computePipelineStage returns sem_resposta for 6+ outgoing messages with no reply', () => {
  const result = computePipelineStage({ historico: outgoing(7), analises: [] });
  assert.equal(result.stage, 'sem_resposta');
  assert.equal(result.followUpCount, 7);
});

test('computePipelineStage returns engajado when replied and no analysis exists yet', () => {
  const historico = [...outgoing(1), { tipo: 'incoming', data: 'x', conteudo: 'oi' }];
  const result = computePipelineStage({ historico, analises: [] });
  assert.equal(result.stage, 'engajado');
});

test('computePipelineStage maps the latest conversational stage to the right bucket', () => {
  const historico = [...outgoing(1), { tipo: 'incoming', data: 'x', conteudo: 'oi' }];
  const cases = [
    ['curioso', 'engajado'],
    ['interessado', 'engajado'],
    ['qualificado', 'engajado'],
    ['avaliando', 'engajado'],
    ['com objeção', 'com_objecao'],
    ['em negociação', 'negociacao'],
    ['perto do fechamento', 'negociacao'],
    ['parado', 'parado'],
    ['perdido', 'perdido']
  ];
  for (const [estagioAtual, expectedBucket] of cases) {
    const result = computePipelineStage({ historico, analises: [{ date: 'x', estagioAtual }] });
    assert.equal(result.stage, expectedBucket, `expected ${estagioAtual} -> ${expectedBucket}`);
  }
});

test('computePipelineStage reads "estagio" (not "estagioAtual") from the first-analysis shape', () => {
  const historico = [...outgoing(1), { tipo: 'incoming', data: 'x', conteudo: 'oi' }];
  const result = computePipelineStage({ historico, analises: [{ date: 'x', estagio: 'perdido' }] });
  assert.equal(result.stage, 'perdido');
});

test('computePipelineStage is case/whitespace tolerant on the conversational stage', () => {
  const historico = [...outgoing(1), { tipo: 'incoming', data: 'x', conteudo: 'oi' }];
  const result = computePipelineStage({ historico, analises: [{ date: 'x', estagioAtual: '  Perdido  ' }] });
  assert.equal(result.stage, 'perdido');
});

test('computePipelineStage uses the most recent analysis, not the first', () => {
  const historico = [...outgoing(1), { tipo: 'incoming', data: 'x', conteudo: 'oi' }];
  const analises = [
    { date: '1', estagioAtual: 'perdido' },
    { date: '2', estagioAtual: 'em negociação' }
  ];
  const result = computePipelineStage({ historico, analises });
  assert.equal(result.stage, 'negociacao');
});
