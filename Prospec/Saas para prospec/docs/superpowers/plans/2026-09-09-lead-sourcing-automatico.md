# Sourcing Automático de Leads — Backend + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar a configuração e a infraestrutura de dados necessárias
para o Prospec.IA cadastrar leads automaticamente a partir de uma busca
diária no Google Places, mais uma tela no dashboard pra o usuário controlar
nichos/região e ver o resumo do dia — sem ainda tocar no fluxo de busca em
si (isso é construído depois, direto na API do n8n, fora deste plano).

**Architecture:** Uma tabela nova no Supabase (`sourcing_settings`) guarda a
configuração (nichos ativos, região, qual nicho foi usado por último); uma
coluna nova em `leads` (`external_place_id`) garante que a busca nunca
cadastre a mesma empresa duas vezes. Duas funções novas em `storage.js`
(`getSourcingConfig`/`saveSourcingConfig`) seguem o padrão já usado por todo
o resto do arquivo (Supabase client direto, sem camada extra). Dois
endpoints novos em `api.js` expõem essas funções pro dashboard, e uma aba
nova no `index.html`/`app.js` deixa o usuário configurar tudo sem precisar
abrir o n8n ou o Supabase.

**Tech Stack:** Node.js + Express, `@supabase/supabase-js`, `node --test` +
`node:assert/strict`, HTML/CSS/JS puro no dashboard (sem framework).

**Spec:** `docs/superpowers/specs/2026-09-09-lead-sourcing-automatico-design.md`

## Global Constraints

- Nenhum Code node / nenhuma lógica de servidor nova fora do padrão já
  existente: `storage.js` é o único arquivo que fala com o Supabase (regra
  já estabelecida no projeto).
- `source: 'google_maps'` é o valor usado pra marcar leads vindos dessa
  automação (spec, seção "Modelo de dados").
- O teto diário de leads sourced é 10 — mas ele é aplicado pelo fluxo do
  n8n (fora deste plano), não pelo endpoint de configuração. Este plano só
  expõe o *resumo* de quantos entraram hoje, não impõe o teto.
- `active_niches` nunca pode ficar vazio quando salvo (pelo menos 1 nicho) —
  sem isso o fluxo do n8n não teria o que buscar.
- Todo teste que cria dados de verdade no Supabase precisa limpar depois de
  si mesmo (padrão já seguido em `tests/storage.test.js` e
  `tests/api.test.js`).

---

### Task 1: Migração no Supabase — tabela `sourcing_settings` e coluna `leads.external_place_id`

**Files:**
- Nenhum arquivo no repositório — a migração é aplicada diretamente via a
  tool `mcp__claude_ai_Supabase__apply_migration` (mesmo padrão já usado no
  projeto pra `ANALYSIS_GENERATED`, documentado em
  `docs/superpowers/plans/2026-08-22-storage-to-supabase.md:474`). Não há
  arquivo `.sql` versionado neste projeto.

**Interfaces:**
- Produces: tabela `sourcing_settings` com colunas `id` (text, PK),
  `active_niches` (jsonb), `target_region` (text), `last_niche_index`
  (int), `updated_at` (timestamptz) — usada pela Task 2. Coluna
  `leads.external_place_id` (text, unique, nullable) — usada pelo fluxo do
  n8n (fora deste plano) pra deduplicar.

- [ ] **Step 1: Aplicar a migração**

Use a tool `mcp__claude_ai_Supabase__apply_migration` com:
- `project_id`: `"pryvtmpjkckjrobyazdw"`
- `name`: `"add_sourcing_settings_and_external_place_id"`
- `query`:

```sql
-- Configuração da prospecção automática via Google Places (Fase de
-- lead-sourcing, ver docs/superpowers/specs/2026-09-09-lead-sourcing-automatico-design.md).
-- Uma linha só (id fixo 'default') - é configuração global do usuário,
-- não por-lead.
create table sourcing_settings (
  id text primary key default 'default',
  active_niches jsonb not null default '[]'::jsonb,
  target_region text not null default '',
  last_niche_index int not null default -1,
  updated_at timestamptz not null default now()
);

-- Identificador único do Google Places (place_id) pra cada lugar
-- cadastrado por essa automação - garante que a busca diária nunca
-- cadastre a mesma empresa duas vezes.
alter table leads add column external_place_id text unique;
```

- [ ] **Step 2: Verificar que a migração foi aplicada**

Rode esta query de leitura (via `mcp__claude_ai_Supabase__execute_sql` ou um
script Node ad-hoc com o `SUPABASE_SERVICE_ROLE_KEY`, mesmo padrão usado o
resto do projeto pra inspecionar dados):

```sql
select column_name, data_type from information_schema.columns
where table_name = 'sourcing_settings'
order by ordinal_position;
```

Esperado: 5 linhas (`id`, `active_niches`, `target_region`,
`last_niche_index`, `updated_at`). E:

```sql
select column_name from information_schema.columns
where table_name = 'leads' and column_name = 'external_place_id';
```

Esperado: 1 linha.

- [ ] **Step 3: Nenhum commit necessário**

Esta task não cria nem modifica nenhum arquivo do repositório — a mudança
vive só no schema do Supabase (mesmo padrão do projeto pra migrações; ver
`docs/superpowers/plans/2026-08-22-storage-to-supabase.md:474`, que fez a
mesma coisa pra adicionar `ANALYSIS_GENERATED`).

---

### Task 2: `storage.js` — `getSourcingConfig` e `saveSourcingConfig`

**Files:**
- Modify: `src/services/storage.js` (adicionar as duas funções no final do
  arquivo, depois de `addToHistory`, linha 341 atual)
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: `getClient()` (função privada já existente em
  `src/services/storage.js:6-11`).
- Produces:
  - `getSourcingConfig(): Promise<{ niches: string[], region: string, nicheToday: string | null, leadsToday: number, dailyCap: number }>`
  - `saveSourcingConfig({ niches: string[], region: string }): Promise<{ niches: string[], region: string }>` — lança `Error` com mensagem legível se `niches` não for um array de strings não-vazias com pelo menos 1 item, ou se `region` não for uma string não-vazia.
  - Ambas usadas pela Task 3.

- [ ] **Step 1: Escrever os testes que falham**

Adicione ao final de `tests/storage.test.js` (depois do último `test(...)`
existente, mantendo os imports do topo do arquivo):

```js
test('getSourcingConfig returns empty niches/region when nothing was saved yet', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await client.from('sourcing_settings').delete().eq('id', 'default');

  const config = await getSourcingConfig();

  assert.deepEqual(config.niches, []);
  assert.equal(config.region, '');
  assert.equal(config.nicheToday, null);
  assert.equal(config.leadsToday, 0);
  assert.equal(config.dailyCap, 10);
});

test('saveSourcingConfig rejects an empty niche list', async () => {
  await assert.rejects(
    () => saveSourcingConfig({ niches: [], region: 'Blumenau, SC' }),
    /Nichos deve ser uma lista de textos não vazios/
  );
});

test('saveSourcingConfig rejects a blank region', async () => {
  await assert.rejects(
    () => saveSourcingConfig({ niches: ['dentista'], region: '  ' }),
    /Região é obrigatória/
  );
});

test('saveSourcingConfig saves niches/region, and getSourcingConfig reads them back', async () => {
  const saved = await saveSourcingConfig({ niches: ['dentista', 'fisioterapia'], region: 'Blumenau, SC, Brasil' });
  assert.deepEqual(saved.niches, ['dentista', 'fisioterapia']);
  assert.equal(saved.region, 'Blumenau, SC, Brasil');

  const config = await getSourcingConfig();
  assert.deepEqual(config.niches, ['dentista', 'fisioterapia']);
  assert.equal(config.region, 'Blumenau, SC, Brasil');
});
```

Também atualize o bloco de import no topo de `tests/storage.test.js` (linha
7-14 atual) pra incluir as duas novas funções:

```js
import {
  getAllProspects,
  getAllProspectsWithPipeline,
  getProspect,
  saveProspect,
  addToHistory,
  deleteProspect,
  getSourcingConfig,
  saveSourcingConfig
} from '../src/services/storage.js';
```

E adicione uma limpeza da linha de configuração ao `cleanup()` existente
(linha 18-23 atual), pra não deixar a linha `'default'` de teste
contaminando execuções futuras:

```js
async function cleanup() {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (createdLeadIds.length > 0) {
    await client.from('leads').delete().in('id', createdLeadIds);
  }
  await client.from('sourcing_settings').delete().eq('id', 'default');
}
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL nos 4 testes novos, com erro `getSourcingConfig is not a function` (ou `saveSourcingConfig is not a function`) — as funções ainda não existem.

- [ ] **Step 3: Implementar as duas funções**

Adicione ao final de `src/services/storage.js`, depois da função
`addToHistory` (depois da linha 341 atual):

```js
/**
 * Lê a configuração da prospecção automática (nichos ativos + região) e um
 * resumo de hoje (nicho da vez + quantos leads sourced entraram hoje).
 * Se a configuração nunca foi salva, retorna nichos/região vazios - quem
 * chama decide o que fazer (o dashboard mostra a lista vazia pro usuário
 * preencher pela primeira vez).
 */
export async function getSourcingConfig() {
  const client = getClient();

  const { data: settings, error: settingsError } = await client
    .from('sourcing_settings')
    .select('active_niches, target_region, last_niche_index')
    .eq('id', 'default')
    .maybeSingle();
  if (settingsError) throw new Error(settingsError.message);

  const niches = settings?.active_niches || [];
  const region = settings?.target_region || '';
  const lastNicheIndex = settings?.last_niche_index ?? -1;
  const nicheToday = lastNicheIndex >= 0 && niches[lastNicheIndex] ? niches[lastNicheIndex] : null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { count, error: countError } = await client
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'google_maps')
    .gte('created_at', startOfToday.toISOString());
  if (countError) throw new Error(countError.message);

  return {
    niches,
    region,
    nicheToday,
    leadsToday: count || 0,
    dailyCap: 10
  };
}

/**
 * Salva a configuração da prospecção automática (nichos ativos + região).
 * Não toca em last_niche_index de propósito - esse campo é controlado só
 * pelo fluxo de busca do n8n, pra saber qual nicho buscar no próximo dia.
 */
export async function saveSourcingConfig({ niches, region }) {
  if (!Array.isArray(niches) || niches.length === 0 || niches.some(n => typeof n !== 'string' || !n.trim())) {
    throw new Error('Nichos deve ser uma lista de textos não vazios');
  }
  if (typeof region !== 'string' || !region.trim()) {
    throw new Error('Região é obrigatória');
  }

  const client = getClient();
  const { data, error } = await client
    .from('sourcing_settings')
    .upsert({ id: 'default', active_niches: niches, target_region: region.trim(), updated_at: new Date().toISOString() })
    .select('active_niches, target_region')
    .single();
  if (error) throw new Error(error.message);

  return { niches: data.active_niches, region: data.target_region };
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS em todos os testes, incluindo os 4 novos e o resto da suite
(regressão zero nos testes já existentes).

- [ ] **Step 5: Commit**

```bash
git add src/services/storage.js tests/storage.test.js
git commit -m "feat: add getSourcingConfig/saveSourcingConfig to storage.js

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Endpoints `GET`/`PUT /api/sourcing-config`

**Files:**
- Modify: `src/routes/api.js`
- Test: `tests/api.test.js`

**Interfaces:**
- Consumes: `getSourcingConfig()`, `saveSourcingConfig({ niches, region })` (Task 2).
- Produces: `GET /api/sourcing-config` → `200` com o objeto de
  `getSourcingConfig()`. `PUT /api/sourcing-config` → `200` com o objeto de
  `saveSourcingConfig()`, ou `400` com `{ error: string }` se a validação
  falhar. Consumido pela Task 4 (`public/js/api.js`).

- [ ] **Step 1: Escrever os testes que falham**

Adicione ao final de `tests/api.test.js`:

```js
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
```

Também atualize o `after(...)` de `tests/api.test.js` (linha 19-26 atual)
pra limpar a linha de configuração de teste, igual foi feito na Task 2:

```js
after(async () => {
  await new Promise(resolve => server.close(resolve));
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (createdLeadIds.length > 0) {
    await client.from('leads').delete().in('id', createdLeadIds);
  }
  await client.from('sourcing_settings').delete().eq('id', 'default');
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL nos 3 testes novos com `404` (rota não existe ainda).

- [ ] **Step 3: Implementar as rotas**

Em `src/routes/api.js`, atualize o import de `storage.js` (linha 6-13
atual) pra incluir as duas funções novas:

```js
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
```

E adicione as duas rotas novas, antes de `export default router;` (linha
138 atual):

```js
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
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS em todos os testes, incluindo os 3 novos.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api.js tests/api.test.js
git commit -m "feat: add GET/PUT /api/sourcing-config endpoints

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Dashboard — aba "Prospecção Automática"

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/api.js`
- Modify: `public/js/app.js`
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: `GET`/`PUT /api/sourcing-config` (Task 3).
- Produces: nenhuma outra task depende desta - é a ponta final visível pro
  usuário.

Esta task não tem teste automatizado (o projeto não tem suíte de teste de
frontend/DOM) - a verificação é manual, descrita no Step 6.

- [ ] **Step 1: Adicionar o botão da aba e a seção no HTML**

Em `public/index.html`, adicione um novo botão depois do botão "Todos os
Leads" (linha 41-43 atual):

```html
      <button class="tab-btn" data-tab="sourcing">
        Prospecção Automática
      </button>
```

E adicione a seção nova depois de `</section>` que fecha a seção `painel`
(linha 301 atual, antes de `</main>` na linha 302):

```html
      <!-- TAB 4: Prospecção Automática -->
      <section id="sourcing" class="tab-content">
        <div class="panel">
          <h2>Prospecção Automática</h2>
          <p class="panel-subtitle">Todo dia, sozinho, busca até 10 empresas novas nos nichos abaixo e cadastra no pipeline.</p>

          <div class="form-group">
            <label>Nichos ativos</label>
            <div id="sourcingNicheList" class="niche-list">
              <p class="empty-message">Carregando...</p>
            </div>
            <div class="niche-add-row">
              <input type="text" id="sourcingNewNiche" placeholder="Ex: salão de beleza">
              <button type="button" class="btn btn-secondary" id="btnAddNiche">Adicionar</button>
            </div>
          </div>

          <div class="form-group">
            <label for="sourcingRegion">Região</label>
            <input type="text" id="sourcingRegion" placeholder="Ex: Blumenau, SC, Brasil">
          </div>

          <div id="sourcingStatus" class="sourcing-status">Carregando...</div>

          <button type="button" class="btn btn-primary" id="btnSaveSourcingConfig">Salvar</button>
          <p id="sourcingSaveMessage" class="empty-message" style="display: none;"></p>
        </div>
      </section>
```

- [ ] **Step 2: Adicionar as chamadas de API**

Em `public/js/api.js`, adicione ao final do arquivo:

```js
/**
 * Get the automatic lead-sourcing config (active niches, region, today's summary)
 * GET /api/sourcing-config
 */
export async function getSourcingConfig() {
  console.log('📡 Calling API: GET /api/sourcing-config');
  return fetchAPI('/sourcing-config');
}

/**
 * Save the automatic lead-sourcing config (active niches + region)
 * PUT /api/sourcing-config
 */
export async function saveSourcingConfig(data) {
  console.log('📡 Calling API: PUT /api/sourcing-config');
  return fetchAPI('/sourcing-config', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}
```

- [ ] **Step 3: Adicionar o CSS dos chips de nicho e do painel de status**

Em `public/css/style.css`, adicione ao final do arquivo:

```css
.niche-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.niche-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--primary-color-light);
  color: var(--text-primary);
  border-radius: 16px;
  padding: 4px 10px 4px 14px;
  font-size: 0.9rem;
}

.niche-chip button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 4px;
}

.niche-chip button:hover {
  color: var(--error-color);
}

.niche-add-row {
  display: flex;
  gap: 8px;
}

.niche-add-row input {
  flex: 1;
}

.sourcing-status {
  background: var(--secondary-bg);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 16px 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}
```

- [ ] **Step 4: Atualizar `app.js` — import, estado, e as funções da aba**

Atualize a linha de import do topo de `public/js/app.js` (linha 4 atual):

```js
import { analyzeNewProspect, continueConversation, getProspects, getProspect, deleteProspect, sendMessageNow, getSourcingConfig, saveSourcingConfig } from './api.js';
```

Adicione, depois de `let currentProspects = [];` (linha 9 atual):

```js
let currentSourcingNiches = [];
```

Adicione ao final do arquivo, antes da linha `document.addEventListener('DOMContentLoaded', initializeEventListeners);` (linha 657 atual):

```js
/**
 * Load and render the "Prospecção Automática" tab: active niches, region,
 * and today's summary (which niche was searched, how many leads came in).
 */
async function loadSourcingConfig() {
  console.log('📡 Carregando configuração de prospecção automática...');
  try {
    const config = await getSourcingConfig();
    currentSourcingNiches = config.niches;
    renderNicheList();
    document.getElementById('sourcingRegion').value = config.region;
    const statusEl = document.getElementById('sourcingStatus');
    const nicheLabel = config.nicheToday || 'nenhum ainda';
    statusEl.textContent = `Nicho de hoje: ${nicheLabel} — leads adicionados hoje: ${config.leadsToday} de ${config.dailyCap}`;
  } catch (error) {
    console.error('❌ Erro ao carregar configuração de sourcing:', error);
  }
}

function renderNicheList() {
  const container = document.getElementById('sourcingNicheList');
  if (currentSourcingNiches.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum nicho ativo ainda.</p>';
    return;
  }
  container.innerHTML = '';
  currentSourcingNiches.forEach(niche => {
    const chip = document.createElement('span');
    chip.className = 'niche-chip';
    chip.textContent = niche;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.title = `Remover ${niche}`;
    removeBtn.addEventListener('click', () => handleRemoveNiche(niche));
    chip.appendChild(removeBtn);
    container.appendChild(chip);
  });
}

function handleAddNiche() {
  const input = document.getElementById('sourcingNewNiche');
  const niche = input.value.trim();
  if (!niche || currentSourcingNiches.includes(niche)) {
    input.value = '';
    return;
  }
  currentSourcingNiches.push(niche);
  renderNicheList();
  input.value = '';
}

function handleRemoveNiche(niche) {
  currentSourcingNiches = currentSourcingNiches.filter(n => n !== niche);
  renderNicheList();
}

async function handleSaveSourcingConfig() {
  const region = document.getElementById('sourcingRegion').value.trim();
  const messageEl = document.getElementById('sourcingSaveMessage');
  try {
    await saveSourcingConfig({ niches: currentSourcingNiches, region });
    messageEl.textContent = 'Salvo!';
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 2000);
  } catch (error) {
    messageEl.textContent = `Erro: ${error.message}`;
    messageEl.style.display = 'block';
  }
}
```

- [ ] **Step 5: Ligar a aba nova em `switchTab` e nos event listeners**

Em `public/js/app.js`, dentro de `switchTab` (depois do bloco `if
(tabName === 'painel') { loadPainel(); }`, linha 116-118 atual):

```js
  // Load data if switching to the automatic sourcing config panel
  if (tabName === 'sourcing') {
    loadSourcingConfig();
  }
```

Dentro de `initializeEventListeners`, depois do bloco de
`btnAnalyzarContinuar` (linha 77-80 atual, antes do `console.log('✅ Event
listeners initialized');` na linha 82):

```js
  // Automatic sourcing config: add niche, save
  const btnAddNiche = document.getElementById('btnAddNiche');
  if (btnAddNiche) {
    btnAddNiche.addEventListener('click', handleAddNiche);
  }

  const btnSaveSourcingConfig = document.getElementById('btnSaveSourcingConfig');
  if (btnSaveSourcingConfig) {
    btnSaveSourcingConfig.addEventListener('click', handleSaveSourcingConfig);
  }
```

- [ ] **Step 6: Verificação manual**

Run: `npm start`, abra `http://localhost:3000` no navegador.

1. Clique na aba "Prospecção Automática" — deve mostrar "Nenhum nicho ativo
   ainda", campo de região vazio, e o status "Nicho de hoje: nenhum ainda —
   leads adicionados hoje: 0 de 10".
2. Digite "dentista" no campo de novo nicho e clique "Adicionar" — deve
   aparecer um chip "dentista" com um × pra remover. Repita com
   "fisioterapia".
3. Preencha a região com "Blumenau, SC, Brasil".
4. Clique "Salvar" — deve aparecer a mensagem "Salvo!" por 2 segundos.
5. Recarregue a página (F5), volte pra aba "Prospecção Automática" — os
   dois chips e a região devem estar exatamente como salvos (confirma que
   persistiu no Supabase, não só na memória do navegador).
6. Clique no × do chip "fisioterapia", clique "Salvar", recarregue de novo
   — deve sobrar só "dentista".
7. Apague o nicho restante e clique "Salvar" sem nenhum nicho ativo — deve
   aparecer a mensagem de erro "Erro: Nichos deve ser uma lista de textos
   não vazios" (confirma que a validação do backend chega até a tela).

Ao final, deixe pelo menos um nicho salvo (ex: "dentista") pra não deixar a
configuração vazia — o fluxo do n8n (task futura, fora deste plano) vai
precisar de pelo menos 1 nicho ativo pra ter o que buscar.

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/js/api.js public/js/app.js public/css/style.css
git commit -m "feat: add 'Prospecção Automática' dashboard tab

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Cobertura da spec:** "Modelo de dados" → Task 1 (tabela + coluna).
"Configuração necessária" (chave do Google, cota travada) → não é código,
fica como passo manual do usuário antes do fluxo do n8n ser construído (não
bloqueia esta plan, que não chama a API do Google). "Fluxo de busca diária"
→ explicitamente fora deste plano (construído direto no n8n depois, ver
introdução). "Tela do dashboard" → Task 4. "Testes" (endpoints) → Tasks 2 e
3.

**Placeholder scan:** nenhum "TBD"/"implementar depois" — todo step tem
código completo ou uma lista literal de cliques pra verificação manual.

**Consistência de tipos:** `getSourcingConfig()` retorna
`{ niches, region, nicheToday, leadsToday, dailyCap }` (Task 2) e é
consumida exatamente com esses nomes de campo em `api.js` (Task 4, Step 2 -
repassa o objeto sem transformar) e em `app.js` (Task 4, Step 4 -
`config.niches`, `config.region`, `config.nicheToday`, `config.leadsToday`,
`config.dailyCap`, todos usados). `saveSourcingConfig({ niches, region })`
(Task 2) recebe exatamente o shape que `handleSaveSourcingConfig` monta em
`app.js` (Task 4, Step 4: `{ niches: currentSourcingNiches, region }`) e
que a rota `PUT /api/sourcing-config` (Task 3) repassa direto de
`req.body`. Nomes batem em todas as pontas.
