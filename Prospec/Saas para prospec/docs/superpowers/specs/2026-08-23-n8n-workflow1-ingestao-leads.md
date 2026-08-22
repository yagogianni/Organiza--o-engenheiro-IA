# n8n Workflow 1 — Ingestão de Leads — Design

**Status**: Aprovado em chat 2026-08-23

## 1. Visão geral

Primeiro workflow de automação do `CLAUDE.md` (seção "WORKFLOW 1 — INGESTÃO DE LEADS"), construído dentro do workflow `Prospec` (id `9fcpOvu92gPv3THi`, hoje vazio) no n8n self-hosted da Hostinger. Não envia nenhuma mensagem — só recebe, valida, deduplica e persiste o lead no Supabase, deixando pronto pra automação de outreach (Fase 5+, ainda não construída).

Fonte de entrada: formulário manual hospedado pelo próprio n8n (decisão do usuário — sem scraper automático por enquanto; Google Maps scraping direto violaria os Termos de Serviço do Google, e a Places API exige cartão cadastrado, então ficou de fora por ora).

## 2. Fluxo (nós do n8n)

```
1. Form Trigger
   Campos: Nome da Empresa*, Nicho/Segmento*, Nome do Contato, Telefone, Email, Site
   (* obrigatório no próprio form)

2. Code (Validar + Normalizar)
   - Confirma que pelo menos um de {telefone, email} foi preenchido
     (sem isso não dá pra abordar o lead depois)
   - trim() em todos os campos de texto
   - email em minúsculo
   - Se inválido: throw new Error com mensagem clara (o n8n mostra isso na tela do form)

3. Supabase (Get rows) — checar duplicata
   - Busca em `leads` por email = X OR phone = Y
   - (implementado como duas chamadas Get simples com filtro eq, unidas por um nó Merge,
     já que o node nativo do Supabase no n8n não faz OR direto)

4. If (lead já existe?)
   - Sim → Supabase (Update row): atualiza company_name/niche/role/website se vieram
     preenchidos e o lead existia; NÃO sobrescreve com vazio
   - Não → Supabase (Insert row): cria o lead nomes/campos conforme tabela `leads`
     (name, company_name, niche, phone, email, website, source='manual',
     status='READY_FOR_OUTREACH', automation_enabled=true)

5. Supabase (Insert row em automation_events)
   - event_type='LEAD_CREATED' (mesmo em caso de update — registra que o form foi
     submetido), payload com os dados brutos do form

6. Form response (tela final)
   - "Lead cadastrado! [nome da empresa] está pronto pra prospecção."
```

## 3. Credenciais

- Novo credential n8n do tipo Supabase, usando a mesma `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` que o app já usa (chave já em `.env`) — reaproveita o RLS deny-all-por-padrão já configurado na Fase 2 (service_role ignora RLS).

## 4. Fora de escopo (por decisão do usuário)

- Fonte automática de leads (Google Maps/Places/OSM) — decidir depois.
- Qualquer envio de mensagem (isso é Workflow 2, Fase 5, depende do Evolution API estar conectado via QR).
- Interface bonita do formulário — usa o form padrão do n8n por enquanto.

## 5. Teste

Preencher o formulário 2x com o mesmo e-mail — a segunda vez deve **atualizar**, não duplicar, e o `automation_events` deve ter 2 entradas `LEAD_CREATED` pro mesmo lead. Confirmar via `execute_sql` no Supabase (mesma ferramenta usada na Fase 2).

**Status: testado e funcionando (2026-08-22).** Submissão 1 criou o lead (`status: READY_FOR_OUTREACH`); submissão 2 com o mesmo telefone atualizou nome/empresa/nicho/email/site do mesmo lead (sem duplicar) e registrou o segundo evento `LEAD_CREATED`.

Pegadinha ao testar via curl/API (não afeta o uso normal pelo navegador): o formulário público do n8n renderiza os campos com o rótulo (`fieldLabel`) que aparece na tela, mas o HTML real que o navegador envia usa nomes posicionais `field-0`, `field-1`, `field-2`... (na ordem em que os campos foram definidos no node). O node de Código depois remonta o JSON usando os rótulos (`"Nome da Empresa"`, `"Nicho"`, ...) — por isso o `input['Nome da Empresa']` no Código funciona normalmente. Um POST direto usando os rótulos como chave (ex: `-F "Nome da Empresa=..."`) é aceito com HTTP 200 mas os campos chegam `null`, porque o backend só reconhece `field-0`, `field-1` etc. Um navegador real preenchendo o formulário não tem esse problema — isso só importa para quem for testar via curl/API.
