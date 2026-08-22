# n8n Workflow 1 — Ingestão de Leads — Design

**Status**: Aprovado em chat 2026-08-23. **Reconstruído em 2026-08-22 sem nó de Código** (decisão do usuário: preferir nós visuais em todos os fluxos, mesmo custando mais nós, pra ficar possível entender/editar sem programar).

## 1. Visão geral

Primeiro workflow de automação do `CLAUDE.md` (seção "WORKFLOW 1 — INGESTÃO DE LEADS"), construído dentro do workflow `Prospec` (id `9fcpOvu92gPv3THi`, hoje vazio) no n8n self-hosted da Hostinger. Não envia nenhuma mensagem — só recebe, valida, deduplica e persiste o lead no Supabase, deixando pronto pra automação de outreach (Fase 5+, ainda não construída).

Fonte de entrada: formulário manual hospedado pelo próprio n8n (decisão do usuário — sem scraper automático por enquanto; Google Maps scraping direto violaria os Termos de Serviço do Google, e a Places API exige cartão cadastrado, então ficou de fora por ora).

## 2. Fluxo (nós do n8n) — versão sem código (2026-08-22)

7 nós, todos configurados por formulário/dropdown na UI do n8n (nenhum nó de Código):

```
1. Form Trigger — "Novo Lead (Formulário)"
   Campos: Nome da Empresa*, Nicho*, Nome do Contato, Telefone*, Email, Site
   (Telefone virou obrigatório nesta versão — simplifica a validação porque
   não precisa mais checar "telefone OU email"; faz sentido porque a
   prospecção é via WhatsApp mesmo)

2. Edit Fields (Set) — "Ajustar Campos"
   - trim() em todos os campos de texto, email em minúsculo
   - usa as expressões {{ }} nativas de qualquer campo do n8n (não é um nó de código)

3. HTTP Request (GET) — "Buscar Lead pelo Telefone"
   - Chama a REST API do Supabase direto: GET /rest/v1/leads?phone=eq.<telefone>&limit=1
   - "Always Output Data" ligado: garante 1 item de saída mesmo quando não acha
     nada (evita o problema clássico do n8n de "0 resultados = nenhum nó roda depois")

4. If — "Lead já existe?"
   - Condição: o item tem um `id` preenchido?

5. Dois caminhos (HTTP Request nativo do n8n, sem código):
   - Sim → PATCH /rest/v1/leads?id=eq.<id> — atualiza name/company_name/niche/
     email/website, mas só os campos que vieram preenchidos (não sobrescreve
     com vazio)
   - Não → POST /rest/v1/leads — cria o lead com status='READY_FOR_OUTREACH',
     source='manual', automation_enabled=true

6. HTTP Request (POST) — "Registrar Evento"
   - POST /rest/v1/automation_events, event_type='LEAD_CREATED', payload com
     os dados brutos do formulário

7. Form (completion) — "Tela de Sucesso"
   - "Lead cadastrado! [nome da empresa] está pronto pra prospecção."
```

Único ponto que ainda usa uma expressão com um pouco de lógica (não é um nó de
código, é um campo dentro do nó HTTP de atualização): o corpo do PATCH usa
`Object.fromEntries(...).filter(...)` pra montar o JSON só com os campos que
vieram preenchidos, garantindo que reenviar o formulário com um campo em
branco não apague um valor que já existia. Fora esse único campo, é tudo
clique-e-configure.

## 3. Credenciais

- A URL e a chave `service_role` do Supabase estão escritas direto nos nós HTTP
  Request (nos headers `apikey`/`Authorization`), do mesmo jeito que estavam
  no nó de Código da versão anterior — não há credential nativa do Supabase
  conectada (existe uma criada no n8n, `Prospec.IA Supabase` id `GNu3ncm3saWrdJsa`,
  mas não está em uso; nenhum nó HTTP Request genérico consegue usá-la, só o
  nó nativo Supabase do n8n).

## 4. Fora de escopo (por decisão do usuário)

- Fonte automática de leads (Google Maps/Places/OSM) — decidir depois.
- Qualquer envio de mensagem (isso é Workflow 2, Fase 5, depende do Evolution API estar conectado via QR).
- Interface bonita do formulário — usa o form padrão do n8n por enquanto.

## 5. Teste

Preencher o formulário 2x com o mesmo e-mail — a segunda vez deve **atualizar**, não duplicar, e o `automation_events` deve ter 2 entradas `LEAD_CREATED` pro mesmo lead. Confirmar via `execute_sql` no Supabase (mesma ferramenta usada na Fase 2).

**Status: testado e funcionando (2026-08-22), inclusive a versão sem código.** Submissão 1 criou o lead (`status: READY_FOR_OUTREACH`); submissão 2 com o mesmo telefone (e email/site em branco) atualizou nome/empresa/nicho do mesmo lead sem duplicar, preservou o email/site já salvos (não apagou com o campo em branco), e registrou o segundo evento `LEAD_CREATED`. A tela final também foi conferida (`Lead cadastrado! <nome> está pronto pra prospecção.`) via o link de espera do formulário.

Pegadinha ao testar via curl/API (não afeta o uso normal pelo navegador): o formulário público do n8n renderiza os campos com o rótulo (`fieldLabel`) que aparece na tela, mas o HTML real que o navegador envia usa nomes posicionais `field-0`, `field-1`, `field-2`... (na ordem em que os campos foram definidos no node). O node de Código depois remonta o JSON usando os rótulos (`"Nome da Empresa"`, `"Nicho"`, ...) — por isso o `input['Nome da Empresa']` no Código funciona normalmente. Um POST direto usando os rótulos como chave (ex: `-F "Nome da Empresa=..."`) é aceito com HTTP 200 mas os campos chegam `null`, porque o backend só reconhece `field-0`, `field-1` etc. Um navegador real preenchendo o formulário não tem esse problema — isso só importa para quem for testar via curl/API.
