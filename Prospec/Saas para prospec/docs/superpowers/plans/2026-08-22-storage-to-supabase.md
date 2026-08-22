# Migrate storage.js to Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/services/storage.js`'s JSON5-file persistence with the Supabase Postgres project created in Fase 2 (`prospec-ia`, project_id `pryvtmpjkckjrobyazdw`), keeping its exported function signatures and return shapes byte-for-byte identical so `routes/api.js`, `services/ai.js`, and the frontend need zero changes.

**Architecture:** `storage.js` stays the *only* file that talks to the database (established pattern from `ANALISE_ARQUITETURA_AUTOMACAO.md` §3). Internally it now maps the app's "prospect" concept onto the normalized schema from `CLAUDE.md`: one `leads` row + one `conversations` row per prospect, one `messages` row per outbound/inbound message, one `automation_events` row per AI analysis (and one per inbound reply, for audit per `CLAUDE.md` §"LOGS E AUDITORIA").

**Tech Stack:** `@supabase/supabase-js` (official client), Node's built-in `node:test`, real integration tests against the live `prospec-ia` project (this codebase's established testing style — see `tests/site-scraper.test.js` for the precedent of testing against real endpoints, not mocks).

**Spec:** `CLAUDE.md` (entities, states), `ANALISE_ARQUITETURA_AUTOMACAO.md` (why `storage.js` is the isolation boundary).

## Global Constraints

- `storage.js`'s exported functions (`initializeDataDir`, `getAllProspects`, `getAllProspectsWithPipeline`, `getProspect`, `saveProspect`, `addToHistory`) keep their exact names, parameters, and return shapes — no caller anywhere else in the codebase changes.
- `getProspect`/`addToHistory` still throw `Error('PROSPECT_NOT_FOUND')` for an unknown id (tested contract relied on by `routes/api.js`).
- Server-side only: the Supabase client uses the **service_role** key (bypasses RLS by design), never the anon/publishable key. This key is a secret — lives only in `.env` (gitignored), never committed, never logged.
- `CLAUDE.md`'s `leads` table is a *minimum* field set ("Campos mínimos") — adding `role` and `notes` columns for data the existing UI needs (cargo, informações adicionais) is allowed, not a spec violation.
- No behavior change to the two-tier pipeline model built in the previous milestone: `pipeline.js`'s `computePipelineStage` still receives `{historico, analises}` in the exact shape it already expects — this migration only changes where that shape comes from.

---

### Task 1: Extend the `leads` table, add the Supabase client, and wire config

**Files:**
- Supabase migration (via `apply_migration` MCP tool, not a local file — this project has no local Supabase CLI/migrations folder set up)
- Modify: `package.json` (add `@supabase/supabase-js`)
- Modify: `src/config.js`
- Modify: `.env` / `.env.example`

**Interfaces:**
- Produces: `src/config.js` exports `SUPABASE_URL` (string) and `SUPABASE_SERVICE_ROLE_KEY` (string|undefined) — consumed by Task 2.

- [ ] **Step 1: Add `role` and `notes` columns to `leads`**

Apply this migration via the Supabase MCP `apply_migration` tool (`project_id: "pryvtmpjkckjrobyazdw"`, `name: "leads_add_role_and_notes"`):

```sql
-- CLAUDE.md's Lead entity lists "campos mínimos" — role (cargo) and notes
-- (informações adicionais) are additional fields the existing Prospec.IA
-- UI needs, not part of the automation core, so they're kept simple text.
alter table leads add column role text;
alter table leads add column notes text;
```

- [ ] **Step 2: Install the Supabase client**

Run (from `Saas para prospec/`): `npm install @supabase/supabase-js`

- [ ] **Step 3: Add Supabase config to `src/config.js`**

Add these two lines to the existing exports (keep everything else in the file unchanged):

```javascript
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pryvtmpjkckjrobyazdw.supabase.co';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

- [ ] **Step 4: Add the real service_role key to `.env`, and a placeholder to `.env.example`**

In `.env`, add:
```
SUPABASE_URL=https://pryvtmpjkckjrobyazdw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<the real key the user provided>
```

In `.env.example`, add (no real key):
```
# Supabase (banco central - Fase 2 do CLAUDE.md)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

- [ ] **Step 5: Verify the client can connect**

Run: `node -e "import('./src/services/../config.js').then(async () => { const { createClient } = await import('@supabase/supabase-js'); const dotenv = await import('dotenv'); dotenv.config(); const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); const { data, error } = await c.from('leads').select('id').limit(1); console.log('error:', error, 'data:', data); });"`

Expected: `error: null data: []` (empty table, no error — confirms the key/URL/RLS bypass all work).

- [ ] **Step 6: Commit**

```bash
git add package.json src/config.js .env.example
git commit -m "feat: add Supabase client config and leads.role/notes columns"
```

(`.env` is gitignored — it will not show up in `git status`, nothing to stage there.)

---

### Task 2: Rewrite `storage.js` against Supabase

**Files:**
- Modify: `src/services/storage.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from `src/config.js` (Task 1).
- Produces: same six exports as before, same shapes. `getProspect(id)` returns `{id, empresa, segmento, contato, cargo, info, site, status, dateCreated, historico: [{data, tipo, conteudo}], analises: [{date, ...analysisFields}]}` — this exact shape is what `pipeline.js`'s `computePipelineStage` and `ai.js`'s `buildContinuePrompt` already consume; do not change it.

**Mapping (old JSON5 shape → new tables):**
| Old | New |
|---|---|
| `metadata.{empresa,segmento,contato,cargo,info,site}` | `leads.{company_name,niche,name,role,notes,website}` |
| `metadata.dateCreated` | `leads.created_at` |
| one `history.json5` per prospect | one `conversations` row + N `messages` rows for that lead |
| `history.messages[].{data,tipo,conteudo}` | `messages.{created_at, direction ('outgoing'→'OUTBOUND'/'incoming'→'INBOUND'), content}` |
| `analyses.analyses[]` (first shape has `estagio`, continue shape has `estagioAtual`) | `automation_events` rows, `event_type = 'INITIAL_MESSAGE_SENT'` for the first analysis, `'ANALYSIS_GENERATED'` for subsequent ones, `payload = <the whole analysis object>` |
| (new) inbound reply itself | a separate `automation_events` row, `event_type = 'RESPONSE_RECEIVED'`, `payload = {content: resposta}` |

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/storage.test.js`:

```javascript
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config();

import {
  getAllProspects,
  getAllProspectsWithPipeline,
  getProspect,
  saveProspect,
  addToHistory
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

test('addToHistory throws PROSPECT_NOT_FOUND for an unknown id', async () => {
  await assert.rejects(
    () => addToHistory('00000000-0000-0000-0000-000000000000', 'oi', {}),
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — current `storage.js` still reads/writes JSON5 files, ignores Supabase entirely, so shapes won't match (e.g. `saved.id` won't be a lead the new tests can find via Supabase-backed `getAllProspects`).

- [ ] **Step 3: Replace `src/services/storage.js`**

```javascript
// src/services/storage.js - Supabase-backed persistence
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../config.js';

let client;
function getClient() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return client;
}

/**
 * No-op: Supabase tables already exist (created via migration). Kept so
 * src/index.js's startup call doesn't need to change.
 */
export async function initializeDataDir() {
  // Intentionally empty - schema lives in Supabase migrations now.
}

/**
 * Lê todos os leads (índice resumido, sem histórico/análises)
 */
export async function getAllProspects() {
  const { data, error } = await getClient()
    .from('leads')
    .select('id, company_name, name, role, niche, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  return data.map(lead => ({
    id: lead.id,
    empresa: lead.company_name,
    contato: lead.name,
    cargo: lead.role,
    segmento: lead.niche,
    status: 'frio',
    dateCreated: lead.created_at
  }));
}

async function fetchHistoricoAndAnalises(leadId) {
  const client = getClient();

  const { data: messages, error: messagesError } = await client
    .from('messages')
    .select('created_at, direction, content')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (messagesError) throw new Error(messagesError.message);

  const { data: events, error: eventsError } = await client
    .from('automation_events')
    .select('created_at, event_type, payload')
    .eq('lead_id', leadId)
    .in('event_type', ['INITIAL_MESSAGE_SENT', 'ANALYSIS_GENERATED'])
    .order('created_at', { ascending: true });
  if (eventsError) throw new Error(eventsError.message);

  return {
    historico: messages.map(m => ({
      data: m.created_at,
      tipo: m.direction === 'OUTBOUND' ? 'outgoing' : 'incoming',
      conteudo: m.content
    })),
    analises: events.map(e => ({ date: e.created_at, ...e.payload }))
  };
}

/**
 * Lê todos os leads já enriquecidos com histórico e análises, para
 * permitir o cálculo do estágio do pipeline na camada de rotas
 */
export async function getAllProspectsWithPipeline() {
  const prospects = await getAllProspects();
  return Promise.all(prospects.map(async (p) => {
    const { historico, analises } = await fetchHistoricoAndAnalises(p.id);
    return { ...p, historico, analises };
  }));
}

/**
 * Lê um lead específico, combinando dados + histórico + análises
 */
export async function getProspect(id) {
  const { data: lead, error } = await getClient()
    .from('leads')
    .select('id, company_name, name, role, niche, website, notes, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!lead) throw new Error('PROSPECT_NOT_FOUND');

  const { historico, analises } = await fetchHistoricoAndAnalises(id);

  return {
    id: lead.id,
    empresa: lead.company_name,
    segmento: lead.niche,
    contato: lead.name,
    cargo: lead.role,
    info: lead.notes,
    site: lead.website,
    status: 'frio',
    dateCreated: lead.created_at,
    historico,
    analises
  };
}

/**
 * Salva novo lead: cria o lead, a conversa, a primeira mensagem, e o
 * evento de auditoria da primeira análise
 */
export async function saveProspect(prospectData, analysis) {
  const client = getClient();

  const { data: lead, error: leadError } = await client
    .from('leads')
    .insert({
      name: prospectData.contato,
      company_name: prospectData.empresa,
      niche: prospectData.segmento,
      role: prospectData.cargo,
      notes: prospectData.info || null,
      website: prospectData.site || null,
      source: 'manual',
      status: 'WAITING_RESPONSE'
    })
    .select('id, company_name, name, role, niche, website, notes, created_at')
    .single();
  if (leadError) throw new Error(leadError.message);

  const { data: conversation, error: convError } = await client
    .from('conversations')
    .insert({ lead_id: lead.id, channel: 'manual', status: 'OPEN' })
    .select('id')
    .single();
  if (convError) throw new Error(convError.message);

  const { error: messageError } = await client
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      lead_id: lead.id,
      direction: 'OUTBOUND',
      content: analysis.mensagem,
      channel: 'manual'
    });
  if (messageError) throw new Error(messageError.message);

  const { error: eventError } = await client
    .from('automation_events')
    .insert({ lead_id: lead.id, event_type: 'INITIAL_MESSAGE_SENT', payload: analysis });
  if (eventError) throw new Error(eventError.message);

  return {
    id: lead.id,
    empresa: lead.company_name,
    segmento: lead.niche,
    contato: lead.name,
    cargo: lead.role,
    info: lead.notes,
    site: lead.website,
    status: 'frio',
    dateCreated: lead.created_at
  };
}

/**
 * Registra a resposta recebida do lead, a próxima mensagem enviada, e
 * a análise correspondente
 */
export async function addToHistory(id, resposta, analise) {
  const client = getClient();

  const { data: lead, error: leadError } = await client
    .from('leads')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error('PROSPECT_NOT_FOUND');

  const { data: conversation, error: convError } = await client
    .from('conversations')
    .select('id')
    .eq('lead_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (convError) throw new Error(convError.message);

  const { error: incomingError } = await client
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      lead_id: id,
      direction: 'INBOUND',
      content: resposta,
      channel: 'manual'
    });
  if (incomingError) throw new Error(incomingError.message);

  const { error: responseEventError } = await client
    .from('automation_events')
    .insert({ lead_id: id, event_type: 'RESPONSE_RECEIVED', payload: { content: resposta } });
  if (responseEventError) throw new Error(responseEventError.message);

  if (analise.proximaMensagem) {
    const { error: outgoingError } = await client
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        lead_id: id,
        direction: 'OUTBOUND',
        content: analise.proximaMensagem,
        channel: 'manual'
      });
    if (outgoingError) throw new Error(outgoingError.message);
  }

  const { error: analysisEventError } = await client
    .from('automation_events')
    .insert({ lead_id: id, event_type: 'ANALYSIS_GENERATED', payload: analise });
  if (analysisEventError) throw new Error(analysisEventError.message);
}
```

- [ ] **Step 4: Add the `ANALYSIS_GENERATED` event type**

The enum created in Fase 2 doesn't include it yet. Apply via the Supabase MCP `apply_migration` tool (`project_id: "pryvtmpjkckjrobyazdw"`, `name: "add_analysis_generated_event_type"`):

```sql
-- CLAUDE.md's "LOGS E AUDITORIA" section requires logging "qual estratégia
-- foi usada / qual prompt gerou a mensagem" for every AI analysis. None of
-- the 7 original event types represent that specifically - this one does.
alter type automation_event_type add value 'ANALYSIS_GENERATED';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all `storage.test.js` tests pass, and the rest of the suite (`api.test.js`, `ai.test.js`, `pipeline.test.js`, `site-scraper.test.js`, `utils.test.js`) still passes unchanged, since they only depend on `storage.js`'s exported contract, not its internals.

- [ ] **Step 6: Manual smoke test through the real app**

Run: `rm -rf data && npm start` (the `data/` folder is no longer used, but removing it confirms nothing secretly still depends on it), then create a prospect through the UI (or `curl -X POST .../api/analyze`) and confirm it appears in Supabase: use the `list_tables`/`execute_sql` Supabase MCP tools, or check `SELECT * FROM leads ORDER BY created_at DESC LIMIT 1;`.

- [ ] **Step 7: Commit**

```bash
git add src/services/storage.js tests/storage.test.js
git commit -m "feat: migrate storage.js from JSON5 files to Supabase"
```
