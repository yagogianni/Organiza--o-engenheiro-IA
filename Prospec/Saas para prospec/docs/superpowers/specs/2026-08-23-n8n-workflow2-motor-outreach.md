# n8n Workflow 2 — Motor de Outreach (Primeiro Contato) — Design

**Status**: Aprovado em chat 2026-08-23. Testado e funcionando (2026-08-23).

## 1. Visão geral

Segundo workflow de automação do `CLAUDE.md` (seção "WORKFLOW 2 — MOTOR DE OUTREACH"), construído dentro do mesmo workflow `Prospec` (id `9fcpOvu92gPv3THi`) que já tem o Workflow 1. Roda sozinho, periodicamente, buscando leads prontos (`status=READY_FOR_OUTREACH`, `automation_enabled=true`), gerando a mensagem de primeiro contato com IA, e deixando tudo pronto para envio.

**Decisão do usuário**: como o Evolution API (WhatsApp) ainda não está conectado, este workflow constrói tudo *até o passo de enviar* — a mensagem fica registrada como pendente (`sent_at = null`) em vez de sair pelo WhatsApp. Quando o Evolution API for conectado via QR, basta adicionar o último passo (ler mensagens pendentes → enviar → marcar `sent_at`); nada do que foi construído aqui precisa ser refeito.

Todos os nós são visuais (nenhum nó de Código), incluindo a chamada de IA — usa o nó nativo de IA do n8n (Basic LLM Chain + sub-nó de modelo + sub-nó de saída estruturada) em vez de uma chamada HTTP genérica, por sugestão do usuário.

## 2. Fluxo (9 nós principais + 2 sub-nós de IA)

```
1. Schedule Trigger — "Verificar Leads Prontos"
   Roda a cada 30 min (ajustável com um clique no próprio nó)

2. HTTP Request (GET) — "Buscar Leads Elegíveis"
   GET /rest/v1/leads?status=eq.READY_FOR_OUTREACH&automation_enabled=eq.true
   (a resposta em array já faz o n8n rodar o resto do fluxo uma vez por lead
   elegível, automaticamente — sem precisar de nó de loop)

3. Basic LLM Chain — "Gerar Mensagem com IA"
   ├─ sub-nó "Google Gemini Chat Model" (credential googlePalmApi,
   │  id mCzmOBhavx7anNTR, mesma chave do .env)
   └─ sub-nó "Estrutura da Resposta" (Structured Output Parser — define o
      formato exato: estagio, situacaoAtual, objetivo, estrategia,
      oQueEvitar, mensagem, alternativa)
   O prompt no corpo do nó é uma cópia fiel do `buildAnalysisPrompt` +
   `METODOLOGIA` de `src/services/ai.js` (Ícaro + Sobral), com os dados do
   lead injetados via expressões {{ }}.

4. If — "Mensagem Válida?"
   Confirma que a IA realmente devolveu um campo `mensagem` não vazio

5. HTTP Request (GET) — "Revalidar Estado do Lead"
   Busca o lead de novo por id (Always Output Data ligado), pra garantir que
   nada mudou entre o passo 2 e agora (regra crítica do CLAUDE.md)

6. If — "Ainda Elegível?"
   Confirma de novo status=READY_FOR_OUTREACH e automation_enabled=true

7. HTTP Request (POST) — "Criar Conversa"
   POST /rest/v1/conversations (lead_id, channel='manual', status='OPEN')

8. HTTP Request (POST) — "Registrar Mensagem Pendente"
   POST /rest/v1/messages (conversation_id, lead_id, direction='OUTBOUND',
   content=mensagem, channel='manual', sent_at deixado em branco = pendente)

9. HTTP Request (PATCH) — "Atualizar Status do Lead"
   PATCH /rest/v1/leads?id=eq.<id> — status='OUTREACH_ACTIVE'
   (impede que o mesmo lead seja pego de novo no próximo ciclo)
```

Quando o "Mensagem Válida?" ou o "Ainda Elegível?" dá false, o fluxo
simplesmente para ali para aquele lead (nenhum ramo de erro construído —
o lead continua como estava e será reavaliado no próximo ciclo).

## 3. Decisões de design

- **Por que `messages` com `sent_at=null` em vez de um evento novo em
  `automation_events`**: a primeira tentativa tentou registrar um evento
  `MESSAGE_READY_FOR_SEND`, mas `automation_events.event_type` é um enum do
  Postgres com uma lista fixa de valores (só os 7 exemplos do CLAUDE.md) —
  inserir um valor novo quebra com erro de enum inválido. Reaproveitar a
  tabela `messages` (que já aceita `direction='OUTBOUND'`) com `sent_at`
  em branco como sinal de "gerada, esperando envio" evita mexer no schema
  agora. Quando o envio de verdade for construído, ele só precisa dar
  `UPDATE` nesse `sent_at` em vez de inserir uma linha nova.
- **Por que `status='OUTREACH_ACTIVE'` e não um estado novo**: `OUTREACH_ACTIVE`
  já está na lista de estados do CLAUDE.md e descreve bem "em processo de
  abordagem" — reaproveitar evita criar estado redundante (regra explícita
  do CLAUDE.md).
- **channel='manual'** nos dois inserts (`conversations`/`messages`) por
  enquanto — mesmo valor já validado em uso desde a Fase 1/2. Trocar para
  `'whatsapp'` (ou o que for) quando o Evolution API for conectado, junto
  com a verificação de que esse valor é aceito pelo enum de canal.
- **Gotcha de teste encontrado**: a saída do nó HTTP Request do n8n, quando
  a API responde com um array de 1 item, já vem "desembrulhada" como o
  objeto direto (`$json.id`, não `$json[0].id`) — mesmo comportamento já
  visto no Workflow 1. Bug real cometido e corrigido durante o teste.

## 4. Fora de escopo (por decisão do usuário)

- Envio de verdade pelo WhatsApp — depende do Evolution API conectado via QR.
- Webhook de entrada do Evolution API — isso é do Workflow 4 (monitoramento
  de respostas), não deste.

## 5. Teste

Lead de teste inserido diretamente no Supabase com `status=READY_FOR_OUTREACH`
e `automation_enabled=true`; intervalo do Schedule Trigger temporariamente
reduzido para 1 min só durante o teste (voltou para 30 min depois).

**Resultado confirmado**: mensagem gerada seguiu a metodologia (pattern
interrupt específico do segmento, dois horários concretos, espaço para o
não, sem urgência falsa); `conversations` e `messages` criados corretamente
(`sent_at=null`); `leads.status` virou `OUTREACH_ACTIVE`. Dados de teste
removidos do Supabase depois da verificação.
