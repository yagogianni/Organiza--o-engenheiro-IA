# n8n Workflow 3 — Motor de Follow-up — Design

**Status**: Aprovado em chat 2026-08-23. Testado e funcionando (2026-08-23).

## 1. Visão geral

Terceiro workflow de automação do `CLAUDE.md` (seção "WORKFLOW 3 — MOTOR DE
FOLLOW-UP"), construído no mesmo workflow `Prospec` (id `9fcpOvu92gPv3THi`)
dos Workflows 1 e 2. Roda periodicamente, encontra leads que mandamos
mensagem e nunca responderam, e gera o próximo follow-up — sem enviar de
verdade ainda (mesma decisão do Workflow 2: fica pendente até o Evolution
API estar conectado).

O usuário escolheu fazer este workflow antes do Workflow 4 (monitoramento de
respostas via WhatsApp) porque o Workflow 4 depende de configurar uma nova
sessão no Evolution API, e o Workflow 3 não depende disso.

Todos os nós são visuais, incluindo a IA (Basic LLM Chain + Google Gemini
Chat Model + Structured Output Parser), com o mesmo padrão System/User do
Workflow 2 (ver seção 2.1 do spec do Workflow 2).

## 2. Por que não precisou mexer no schema do banco

O CLAUDE.md descreve `follow_up_count` e `next_action_at` como campos de uma
entidade `LeadCampaign` que nunca construímos (a Fase 2 simplificou pra só
`leads`/`conversations`/`messages`/`automation_events`, sem campanhas ainda).
Confirmamos via o schema real do Supabase (`GET /rest/v1/` — OpenAPI do
PostgREST) que `leads` não tem essas colunas. Em vez de migrar o banco,
reaproveitamos o que já existe:

- **Contador de tentativas**: o próprio enum de `status` já tem
  `WAITING_RESPONSE → FOLLOW_UP_1 → FOLLOW_UP_2 → FOLLOW_UP_3`, then
  `RESTING`. Cada valor já representa "quantas tentativas de follow-up já
  foram feitas" — não precisa de coluna numérica separada.
- **Timing ("já passou tempo suficiente?")**: em vez de um `next_action_at`
  salvo, buscamos a mensagem mais recente do lead (`messages`, ordenada por
  `created_at desc`, limite 1) e comparamos a idade dela com o intervalo
  (3 dias). Evita estado que pode ficar dessincronizado.

## 3. Fluxo (13 nós principais + 2 sub-nós de IA)

```
1. Schedule Trigger — "Verificar Follow-ups" (a cada 30 min)

2. HTTP Request (GET) — "Buscar Leads em Espera"
   GET /rest/v1/leads?status=in.(WAITING_RESPONSE,FOLLOW_UP_1,FOLLOW_UP_2,
   FOLLOW_UP_3)&automation_enabled=eq.true

3. HTTP Request (GET) — "Buscar Última Mensagem" (por lead)
   GET /rest/v1/messages?lead_id=eq.<id>&order=created_at.desc&limit=1
   (Always Output Data ligado)

4. If — "Pronta Pra Follow-up?"
   direction == 'OUTBOUND' E created_at mais antigo que 3 dias atrás
   (se for INBOUND, o lead respondeu — não faz follow-up; proteção extra
   já que o Workflow 4, que pausaria a automação na resposta, ainda não
   existe)

5. If — "Já no Limite (3)?"
   status atual == FOLLOW_UP_3?
   ├─ Sim → "Colocar em Descanso": PATCH leads status='RESTING',
   │        automation_enabled=false (fim do ciclo pra esse lead)
   └─ Não → segue pro passo 6

6. Basic LLM Chain — "Gerar Follow-up com IA"
   ├─ sub-nó "Google Gemini Chat Model2" (mesma credential do Workflow 2)
   └─ sub-nó "Estrutura da Resposta2" (schema: mensagem, abordagem)
   Prompt System = mesma metodologia do Workflow 2. Prompt User = dados do
   prospect + a mensagem anterior (sem resposta) + qual tentativa é essa +
   instrução de mudar o ângulo (e sugerir troca de canal, a partir da 2ª
   tentativa).

7. If — "Mensagem de Follow-up Válida?" (mesma checagem defensiva)

8. HTTP Request (GET) — "Revalidar Estado do Lead2" (Always Output Data)

9. If — "Ainda Elegível?2"
   automation_enabled=true E status != 'RESTING'

10. HTTP Request (POST) — "Registrar Follow-up Pendente"
    POST /rest/v1/messages — reaproveita o mesmo conversation_id da última
    mensagem (não cria conversa nova), direction='OUTBOUND', sent_at em
    branco = pendente

11. HTTP Request (PATCH) — "Avançar Status do Lead"
    Avança o status um passo (mapeamento direto: WAITING_RESPONSE→
    FOLLOW_UP_1, FOLLOW_UP_1→FOLLOW_UP_2, FOLLOW_UP_2→FOLLOW_UP_3)
```

## 4. Fora de escopo

- Envio de verdade — igual ao Workflow 2, depende do Evolution API.
- Reativação de leads que foram pro `RESTING` — isso é o Workflow 6.

## 5. Teste

Lead de teste criado com `status=WAITING_RESPONSE`, `automation_enabled=true`,
com uma mensagem `OUTBOUND` inserida com `created_at` de 4 dias atrás
(pra já estar "vencida"). Intervalo do Schedule Trigger reduzido pra 1 min
só durante o teste.

**Resultado confirmado**: o workflow encontrou o lead, considerou a mensagem
antiga elegível, gerou um follow-up com ângulo diferente da mensagem
original (trocou o gancho de "planilha manual" para "horas de fechamento
contábil"), registrou como segunda mensagem `OUTBOUND` pendente na mesma
conversa, e avançou o lead de `WAITING_RESPONSE` para `FOLLOW_UP_1`. Dados
de teste removidos do Supabase depois da verificação.
