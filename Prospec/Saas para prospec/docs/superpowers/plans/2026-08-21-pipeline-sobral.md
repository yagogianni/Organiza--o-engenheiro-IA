# Pipeline de Prospecção (Método Sobral) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second, automatically-computed "pipeline stage" (Método Sobral: Abordado → Em Follow-up → Sem Resposta / Engajado → Com Objeção / Negociação / Parado / Perdido) alongside the existing conversational stage, surfaced as badges + a tip banner in the prospect list, with the AI's follow-up prompts becoming aware of it.

**Architecture:** A new pure-function module (`src/services/pipeline.js`) computes the stage entirely from data already saved (`historico`/`analises`) — no new stored fields. Wired into the two list/detail routes and into `buildContinuePrompt`. Frontend gets badges, a tip banner, and finally-functional search/filter on the existing (previously decorative) inputs.

**Tech Stack:** Same as the rest of the project — Node/Express, JSON5 storage, vanilla JS frontend, `node:test`.

**Spec:** `docs/superpowers/specs/2026-08-21-pipeline-sobral-design.md`

## Global Constraints

- No new stored fields — pipeline stage is 100% derived from existing `historico`/`analises`.
- No manual stage editing — everything computed, per user decision in the spec.
- The feature lives inside the existing "Continuar Conversa" tab (renamed "📊 Pipeline") — no new tab/page.
- Stage ids and tips are fixed by the spec table (section 2) — copy them verbatim.

---

### Task 1: `src/services/pipeline.js` — stage computation

**Files:**
- Create: `src/services/pipeline.js`
- Create: `tests/pipeline.test.js`

**Interfaces:**
- Produces: `computePipelineStage(prospect: { historico: Array<{tipo, data, conteudo}>, analises: Array<object> }): { stage: string, label: string, tip: string, followUpCount: number }` — consumed by Task 3 (routes) and Task 4 (`buildContinuePrompt`).
- Stage ids (fixed): `abordado`, `em_followup`, `sem_resposta`, `engajado`, `com_objecao`, `negociacao`, `parado`, `perdido`.

- [ ] **Step 1: Write the failing tests**

Create `tests/pipeline.test.js`:

```javascript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/services/pipeline.js'`.

- [ ] **Step 3: Implement `src/services/pipeline.js`**

```javascript
// src/services/pipeline.js - Pipeline stage computation (Método Sobral)

const STAGE_INFO = {
  abordado: {
    label: 'Abordado',
    tip: 'Primeira mensagem enviada. Aguarde alguns dias antes do 1º follow-up.'
  },
  em_followup: {
    label: 'Em Follow-up',
    tip: 'Envie o próximo follow-up — considere trocar de canal (ex: Instagram → WhatsApp).'
  },
  sem_resposta: {
    label: 'Sem Resposta',
    tip: '5+ follow-ups sem resposta é esperado no método — deixe descansar e tente reabordar mais adiante, ou peça indicação a outro contato.'
  },
  engajado: {
    label: 'Engajado',
    tip: 'Prospect respondeu! Continue a conversa e qualifique a necessidade.'
  },
  com_objecao: {
    label: 'Com Objeção',
    tip: 'Neutralize a objeção diretamente, sem ignorar.'
  },
  negociacao: {
    label: 'Em Negociação',
    tip: 'Foque em remover os últimos obstáculos e marcar o próximo passo concreto.'
  },
  parado: {
    label: 'Parado',
    tip: 'Crie uma razão legítima e específica para voltar a falar — evite follow-up genérico.'
  },
  perdido: {
    label: 'Perdido',
    tip: 'Recusou. Puxe o script de pedir indicação — uma recusa pode virar uma indicação.'
  }
};

function countOutgoingBeforeFirstReply(historico) {
  let count = 0;
  for (const msg of historico) {
    if (msg.tipo === 'incoming') break;
    if (msg.tipo === 'outgoing') count++;
  }
  return count;
}

function getLatestConversationalStage(analises) {
  if (!analises || analises.length === 0) return '';
  const last = analises[analises.length - 1];
  return (last.estagioAtual || last.estagio || '').toLowerCase().trim();
}

function bucketFromConversationalStage(stage) {
  if (stage === 'com objeção') return 'com_objecao';
  if (stage === 'em negociação' || stage === 'perto do fechamento') return 'negociacao';
  if (stage === 'parado') return 'parado';
  if (stage === 'perdido') return 'perdido';
  return 'engajado';
}

/**
 * Calcula o estágio do pipeline (método Sobral) a partir do histórico e
 * análises já salvos de um prospect — não depende de nenhum campo extra.
 */
export function computePipelineStage(prospect) {
  const historico = prospect.historico || [];
  const analises = prospect.analises || [];
  const hasIncoming = historico.some(msg => msg.tipo === 'incoming');
  const followUpCount = countOutgoingBeforeFirstReply(historico);

  let stage;
  if (!hasIncoming) {
    if (followUpCount <= 1) stage = 'abordado';
    else if (followUpCount <= 5) stage = 'em_followup';
    else stage = 'sem_resposta';
  } else {
    stage = bucketFromConversationalStage(getLatestConversationalStage(analises));
  }

  const info = STAGE_INFO[stage];
  const label = stage === 'em_followup' ? `${info.label} (${followUpCount}/5)` : info.label;

  return { stage, label, tip: info.tip, followUpCount };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all `pipeline.test.js` tests pass (8 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/services/pipeline.js" "tests/pipeline.test.js"
git commit -m "feat: compute prospecting pipeline stage from Método Sobral"
```

---

### Task 2: `storage.js` — enriched list for pipeline computation

**Files:**
- Modify: `src/services/storage.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Consumes: existing `readJSON5`, `indexFile`, `historyFile`, `analysesFile` helpers already in the file.
- Produces: `getAllProspectsWithPipeline(): Promise<Array<{id, empresa, contato, cargo, segmento, status, dateCreated, historico, analises}>>` — consumed by Task 3.

- [ ] **Step 1: Write the failing test**

In `tests/storage.test.js`, add this import to the existing import block (alongside `initializeDataDir`, `saveProspect`, etc.):

```javascript
  getAllProspectsWithPipeline
```

Then add this test (anywhere after the `saveProspect` tests):

```javascript
test('getAllProspectsWithPipeline enriches each index entry with historico and analises', async () => {
  const saved = await saveProspect(
    { empresa: 'Delta', segmento: 'Varejo', contato: 'Bruno', cargo: 'Sócio' },
    { mensagem: 'Oi Bruno!', estagio: 'frio' }
  );

  const enriched = await getAllProspectsWithPipeline();
  const entry = enriched.find(p => p.id === saved.id);

  assert.ok(entry);
  assert.equal(entry.empresa, 'Delta');
  assert.equal(entry.historico.length, 1);
  assert.equal(entry.historico[0].tipo, 'outgoing');
  assert.equal(entry.analises.length, 1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `getAllProspectsWithPipeline is not a function`.

- [ ] **Step 3: Implement `getAllProspectsWithPipeline` in `src/services/storage.js`**

Add this function after the existing `getAllProspects` function:

```javascript
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests pass, including the new one.

- [ ] **Step 5: Commit**

```bash
git add "src/services/storage.js" "tests/storage.test.js"
git commit -m "feat: add getAllProspectsWithPipeline for pipeline stage computation"
```

---

### Task 3: Wire pipeline stage into the API routes

**Files:**
- Modify: `src/routes/api.js`
- Modify: `tests/api.test.js`

**Interfaces:**
- Consumes: `computePipelineStage` from `src/services/pipeline.js` (Task 1); `getAllProspectsWithPipeline` from `src/services/storage.js` (Task 2).
- Produces: `GET /api/prospects` response items each gain a `pipeline: {stage, label, tip, followUpCount}` field (and drop the heavy `historico`/`analises` arrays). `GET /api/prospect/:id` response gains the same `pipeline` field alongside its existing full payload.

- [ ] **Step 1: Write the failing tests**

In `tests/api.test.js`, add `saveProspect` to the existing storage import:

```javascript
import { initializeDataDir, saveProspect } from '../src/services/storage.js';
```

Then add these two tests (anywhere after the existing `GET /prospects`/`GET /prospect/:id` tests):

```javascript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `body[0].pipeline` is `undefined` (`Cannot read properties of undefined`).

- [ ] **Step 3: Update `src/routes/api.js`**

Replace the imports at the top:

```javascript
// src/routes/api.js - API Endpoints
import express from 'express';
import { analyzeNewProspect, continueConversation } from '../services/ai.js';
import { fetchSiteText } from '../services/site-scraper.js';
import { computePipelineStage } from '../services/pipeline.js';
import {
  saveProspect,
  getProspect,
  getAllProspectsWithPipeline,
  addToHistory
} from '../services/storage.js';
import { validateNewProspect, validateContinueInput } from '../utils/validators.js';
```

Replace the `GET /prospects` handler:

```javascript
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
```

Replace the `GET /prospect/:id` handler:

```javascript
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/api.js" "tests/api.test.js"
git commit -m "feat: expose computed pipeline stage on the prospects API routes"
```

---

### Task 4: Pipeline-aware follow-up prompt + Sobral approach principles

**Files:**
- Modify: `src/services/ai.js`
- Modify: `tests/ai.test.js`

**Interfaces:**
- Consumes: `computePipelineStage` from `src/services/pipeline.js` (Task 1).
- Produces: `buildContinuePrompt` output now includes a channel-switch nudge when the prospect context is in `em_followup`/`sem_resposta` territory. No signature changes.

- [ ] **Step 1: Write the failing tests**

In `tests/ai.test.js`, add these two tests after the existing `buildContinuePrompt` tests:

```javascript
test('buildContinuePrompt includes a channel-switch nudge when in follow-up territory', () => {
  const historico = [
    { tipo: 'outgoing', data: '1', conteudo: 'msg1' },
    { tipo: 'outgoing', data: '2', conteudo: 'msg2' },
    { tipo: 'outgoing', data: '3', conteudo: 'msg3' }
  ];
  const prompt = buildContinuePrompt(
    { empresa: 'Acme', segmento: 'SaaS', contato: 'Joao', cargo: 'CEO', historico },
    'Oi, desculpa a demora'
  );
  assert.match(prompt, /trocar de canal/);
  assert.match(prompt, /tentativa de contato nº 4/);
});

test('buildContinuePrompt omits the channel-switch nudge on the first reply', () => {
  const historico = [{ tipo: 'outgoing', data: '1', conteudo: 'msg1' }];
  const prompt = buildContinuePrompt(
    { empresa: 'Acme', segmento: 'SaaS', contato: 'Joao', cargo: 'CEO', historico },
    'Oi!'
  );
  assert.doesNotMatch(prompt, /trocar de canal/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — the nudge text is not present in the prompt yet.

- [ ] **Step 3: Update `src/services/ai.js`**

Add the import at the top, alongside the existing ones:

```javascript
import { computePipelineStage } from './pipeline.js';
```

Add these four bullets to the end of the `METODOLOGIA` template string (inside the backticks, right before the closing `` ` ``), based on Sobral M3A03:

```
- Nunca fabrique prova social ou números que não foram informados — prefira declarar especialização real a inventar estatística.
- Não abra a mensagem com "tudo bem?" — soa como telemarketing; vá direto ao ponto.
- Ao propor uma conversa ou reunião, ofereça sempre duas opções específicas de dia/horário, nunca um convite aberto.
- Inclua um "espaço para o não" explícito (ex: "sem problema se não fizer sentido agora") para reduzir a fricção da resposta.
```

Replace the `buildContinuePrompt` function:

```javascript
/**
 * Monta o prompt de continuação de conversa, com histórico completo
 */
export function buildContinuePrompt(prospectContext, resposta) {
  const historico = (prospectContext.historico || [])
    .map(msg => `[${msg.tipo === 'outgoing' ? 'Você' : prospectContext.contato}] ${msg.conteudo}`)
    .join('\n\n');

  const pipeline = computePipelineStage(prospectContext);
  const followUpNote = (pipeline.stage === 'em_followup' || pipeline.stage === 'sem_resposta')
    ? `\nCONTEXTO DE FOLLOW-UP: esta é a tentativa de contato nº ${pipeline.followUpCount + 1} sem resposta anterior registrada. Sugira ativamente trocar de canal de comunicação (ex: se as tentativas anteriores foram por Instagram, sugira WhatsApp, e-mail ou ligação) no campo "timing" ou na "proximaMensagem".\n`
    : '';

  return `Você é um especialista em prospecção B2B e copywriting consultivo, continuando uma conversa já em andamento.

PROSPECT:
- Empresa: ${prospectContext.empresa}
- Segmento: ${prospectContext.segmento}
- Contato: ${prospectContext.contato}
- Cargo: ${prospectContext.cargo}

HISTÓRICO DA CONVERSA:
${historico || '(sem histórico anterior)'}
${followUpNote}
NOVA RESPOSTA RECEBIDA DO PROSPECT:
"${resposta}"

Analise em ordem: o que essa resposta significa, em que estágio do funil estamos agora (${ESTAGIOS_VALIDOS}), qual o objetivo da próxima interação, e qual estratégia seguir. Só depois disso, gere a próxima mensagem.
${METODOLOGIA}
Responda APENAS com um JSON válido, sem texto antes ou depois, no formato:
{
  "oQueSgnifica": "interpretação da resposta do prospect (2-3 linhas)",
  "estagioAtual": "escolha exatamente um destes valores: ${ESTAGIOS_VALIDOS}",
  "ondeEstamos": "estágio anterior → estágio atual",
  "objetivoAgora": "objetivo da próxima interação (1 frase)",
  "estrategiaAgora": "como proceder (2-3 linhas)",
  "oQueNaoFazer": "2-3 armadilhas a evitar agora, separadas por quebra de linha",
  "proximaMensagem": "próxima mensagem pronta para copiar e enviar",
  "timing": "quando enviar (ex: hoje, amanhã de manhã, esperar 2 dias)"
}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add "src/services/ai.js" "tests/ai.test.js"
git commit -m "feat: make follow-up prompts pipeline-aware, add Sobral approach principles"
```

---

### Task 5: Frontend — badges, tip banner, tab rename, working search/filter

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: `pipeline: {stage, label, tip, followUpCount}` field now present on every item from `getProspects()` and on the object from `getProspect(id)` (Task 3).

- [ ] **Step 1: Rename the tab label**

In `public/index.html`, replace:

```html
      <button class="tab-btn" data-tab="continuar-conversa">
        📋 Continuar Conversa
      </button>
```

with:

```html
      <button class="tab-btn" data-tab="continuar-conversa">
        📊 Pipeline
      </button>
```

(The `data-tab="continuar-conversa"` value stays unchanged — only the visible label changes — so no JS wiring breaks.)

- [ ] **Step 2: Replace the filter dropdown options with the 8 pipeline stages**

In `public/index.html`, replace:

```html
              <select id="filterStatus" class="filter-select">
                <option value="">Todos os status</option>
                <option value="frio">Frio</option>
                <option value="curioso">Curioso</option>
                <option value="interessado">Interessado</option>
                <option value="qualificado">Qualificado</option>
              </select>
```

with:

```html
              <select id="filterStatus" class="filter-select">
                <option value="">Todos os status</option>
                <option value="abordado">Abordado</option>
                <option value="em_followup">Em Follow-up</option>
                <option value="sem_resposta">Sem Resposta</option>
                <option value="engajado">Engajado</option>
                <option value="com_objecao">Com Objeção</option>
                <option value="negociacao">Em Negociação</option>
                <option value="parado">Parado</option>
                <option value="perdido">Perdido</option>
              </select>
```

- [ ] **Step 3: Add the pipeline tip banner element**

In `public/index.html`, replace:

```html
              <div id="conversationHistory" class="conversation-history">
                <!-- Histórico carregado dinamicamente -->
              </div>
```

with:

```html
              <div id="pipelineTipBanner" class="pipeline-tip"></div>

              <div id="conversationHistory" class="conversation-history">
                <!-- Histórico carregado dinamicamente -->
              </div>
```

- [ ] **Step 4: Add CSS for the badge color variants, tip banner, and list header layout**

In `public/css/style.css`, replace:

```css
.stage-badge:empty {
  display: none;
}
```

with:

```css
.stage-badge:empty {
  display: none;
}

.stage-badge--negociacao {
  background-color: var(--success-bg);
  color: var(--success-color);
  border-color: var(--success-color);
}

.stage-badge--sem_resposta,
.stage-badge--parado {
  background-color: var(--warning-bg);
  color: var(--warning-color);
  border-color: var(--warning-color);
}

.stage-badge--perdido {
  background-color: var(--error-bg);
  color: var(--error-color);
  border-color: var(--error-color);
}
```

In `public/css/style.css`, replace:

```css
.prospect-item-company {
  font-weight: 600;
  margin-bottom: 0.3rem;
}
```

with:

```css
.prospect-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.prospect-item-header .stage-badge {
  margin-bottom: 0;
  white-space: nowrap;
}

.prospect-item-company {
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.pipeline-tip {
  display: none;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background-color: var(--secondary-bg);
  border-left: 4px solid var(--primary-color);
  font-size: 0.9rem;
  color: var(--text-secondary);
}
```

- [ ] **Step 5: Track the last-loaded prospects list and render badges**

In `public/js/app.js`, replace:

```javascript
console.log('🎯 PROSPEC.AI - App Loading...');
```

with:

```javascript
console.log('🎯 PROSPEC.AI - App Loading...');

let currentProspects = [];
```

Replace:

```javascript
async function loadProspectsList() {
  console.log('📋 Carregando lista de prospects...');
  try {
    const prospects = await getProspects();
    displayProspectsList(prospects);
  } catch (error) {
    console.error('❌ Erro ao carregar prospects:', error);
  }
}
```

with:

```javascript
async function loadProspectsList() {
  console.log('📋 Carregando lista de prospects...');
  try {
    currentProspects = await getProspects();
    renderFilteredProspectsList();
  } catch (error) {
    console.error('❌ Erro ao carregar prospects:', error);
  }
}

/**
 * Apply the search box and pipeline-stage filter to the last-loaded list
 */
function renderFilteredProspectsList() {
  const searchTerm = (document.getElementById('searchProspect')?.value || '').toLowerCase().trim();
  const stageFilter = document.getElementById('filterStatus')?.value || '';

  const filtered = currentProspects.filter(p => {
    const matchesSearch = !searchTerm ||
      p.empresa.toLowerCase().includes(searchTerm) ||
      p.contato.toLowerCase().includes(searchTerm);
    const matchesStage = !stageFilter || (p.pipeline && p.pipeline.stage === stageFilter);
    return matchesSearch && matchesStage;
  });

  displayProspectsList(filtered);
}
```

Replace:

```javascript
function displayProspectsList(prospects) {
  const list = document.getElementById('prospectsList');
  if (!list) return;

  if (!prospects || prospects.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhum prospect ainda.</p>';
    return;
  }

  list.innerHTML = prospects.map(p => `
    <div class="prospect-item" data-id="${p.id}">
      <div class="prospect-item-company">${p.empresa}</div>
      <div class="prospect-item-info">${p.contato} • ${p.cargo}</div>
    </div>
  `).join('');

  // Add click handlers
  list.querySelectorAll('.prospect-item').forEach(item => {
    item.addEventListener('click', () => selectProspect(item.dataset.id, item));
  });
}
```

with:

```javascript
function displayProspectsList(prospects) {
  const list = document.getElementById('prospectsList');
  if (!list) return;

  if (!prospects || prospects.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhum prospect ainda.</p>';
    return;
  }

  list.innerHTML = prospects.map(p => `
    <div class="prospect-item" data-id="${p.id}">
      <div class="prospect-item-header">
        <div class="prospect-item-company">${p.empresa}</div>
        <span class="stage-badge stage-badge--${p.pipeline ? p.pipeline.stage : ''}">${p.pipeline ? p.pipeline.label : ''}</span>
      </div>
      <div class="prospect-item-info">${p.contato} • ${p.cargo}</div>
    </div>
  `).join('');

  // Add click handlers
  list.querySelectorAll('.prospect-item').forEach(item => {
    item.addEventListener('click', () => selectProspect(item.dataset.id, item));
  });
}
```

- [ ] **Step 6: Wire the search box and filter dropdown**

In `public/js/app.js`, replace:

```javascript
  // Show/require the "specify segmento" field only when "Outro" is selected
  const segmentoSelect = document.getElementById('segmento');
  if (segmentoSelect) {
    segmentoSelect.addEventListener('change', () => toggleSegmentoOutro(segmentoSelect.value));
  }
```

with:

```javascript
  // Show/require the "specify segmento" field only when "Outro" is selected
  const segmentoSelect = document.getElementById('segmento');
  if (segmentoSelect) {
    segmentoSelect.addEventListener('change', () => toggleSegmentoOutro(segmentoSelect.value));
  }

  // Pipeline list search/filter
  const searchInput = document.getElementById('searchProspect');
  if (searchInput) {
    searchInput.addEventListener('input', renderFilteredProspectsList);
  }
  const filterSelect = document.getElementById('filterStatus');
  if (filterSelect) {
    filterSelect.addEventListener('change', renderFilteredProspectsList);
  }
```

- [ ] **Step 7: Show the pipeline tip banner when a prospect is selected**

In `public/js/app.js`, replace:

```javascript
  // Display prospect info
  document.getElementById('prospectCompanyName').textContent = prospect.empresa;
  document.getElementById('prospectContactName').textContent = prospect.contato;
  document.getElementById('prospectContactRole').textContent = prospect.cargo;

  // Display conversation history
```

with:

```javascript
  // Display prospect info
  document.getElementById('prospectCompanyName').textContent = prospect.empresa;
  document.getElementById('prospectContactName').textContent = prospect.contato;
  document.getElementById('prospectContactRole').textContent = prospect.cargo;

  // Display pipeline tip
  const tipBanner = document.getElementById('pipelineTipBanner');
  if (tipBanner) {
    if (prospect.pipeline) {
      tipBanner.textContent = `${prospect.pipeline.label}: ${prospect.pipeline.tip}`;
      tipBanner.style.display = 'block';
    } else {
      tipBanner.style.display = 'none';
    }
  }

  // Display conversation history
```

- [ ] **Step 8: Run the backend test suite to confirm nothing broke**

Run: `npm test`
Expected: all tests still pass (this task only touched frontend files).

- [ ] **Step 9: Commit**

```bash
git add public/index.html public/js/app.js public/css/style.css
git commit -m "feat: show pipeline stage badges, tip banner, and working list search/filter"
```

---

### Task 6: End-to-end verification

**Files:** none (verification only — uses the `webapp-testing`/Playwright approach already used earlier in this project)

- [ ] **Step 1: Start the server fresh**

Run: `rm -rf data && npm start` (background)
Expected: boots clean, no missing-key warning.

- [ ] **Step 2: Create 3 prospects via the real API to populate every pipeline bucket**

Use `curl -X POST http://localhost:3000/api/analyze` (or the UI) to create at least:
- One prospect with only its first message sent (no continue) → should show **Abordado**.
- One prospect where `POST /api/continue` is called 2-3 times with no `resposta` actually meaning a real reply each time is fine since every `/continue` call adds an incoming+outgoing pair — to simulate "no reply yet", instead just call `POST /api/analyze` and don't call `/continue` at all, then re-run `/api/analyze`-style checks aren't applicable; the honest way to reach `em_followup` through the real API is not directly exposed (the app always logs a reply when you call `/continue`) — so for this stage, verify it by unit test coverage from Task 1 instead, and only manually verify **Abordado** and **Engajado** end-to-end here.
- One prospect where `POST /api/continue` is called once with a real `resposta` → should show **Engajado** (or another bucket depending on what the AI classifies `estagioAtual` as — accept whatever real bucket appears, the point is confirming the field is populated and renders correctly, not forcing a specific one).

- [ ] **Step 3: Verify in the browser with Playwright**

Navigate to `http://localhost:3000`, click the "📊 Pipeline" tab (confirm the label changed), and confirm:
- Each prospect card shows a stage badge with non-empty text.
- Selecting a prospect shows the tip banner with non-empty text above the conversation history.
- Typing into the search box filters the list to matching company/contact names.
- Selecting a value in the stage filter dropdown filters the list to that stage only.

Take a screenshot of the Pipeline tab with at least 2 prospects showing different badges.

- [ ] **Step 4: Verify test suite one final time**

Run: `npm test`
Expected: all tests pass (pipeline.test.js + updated storage/api/ai tests + everything from before).

- [ ] **Step 5: Report results**

Summarize pass/fail for each check in Step 3, plus the screenshot. No commit for this task — it's verification, not a code change.
