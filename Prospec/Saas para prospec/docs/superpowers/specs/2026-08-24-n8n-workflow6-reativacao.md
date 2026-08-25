# n8n Workflow 6 — Reativação — Design

**Status**: Aprovado em chat 2026-08-24. Testado e funcionando (2026-08-24).

## 1. Visão geral

Sexto workflow de automação do `CLAUDE.md` (seção "WORKFLOW 6 — REATIVAÇÃO"),
construído no mesmo workflow `Prospec` (id `9fcpOvu92gPv3THi`). Cuida de
leads que esgotaram os 3 follow-ups do Workflow 3 sem resposta e foram pro
descanso (`status=RESTING`, `automation_enabled=false`) — depois de tempo
suficiente, tenta reativar com uma abordagem genuinamente nova.

Mesmo padrão dos Workflows 2/3: gera e registra a mensagem como pendente,
sem enviar de verdade ainda (depende do Evolution API pro envio real).

## 2. Fluxo (13 nós principais + 2 sub-nós de IA)

```
1. Schedule Trigger — "Verificar Leads Pra Reativação" (a cada 30 min)

2. HTTP Request (GET) — "Buscar Leads em Descanso"
   GET /rest/v1/leads?status=eq.RESTING

3. HTTP Request (GET) — "Buscar Última Mensagem do Ciclo" (a mais recente)

4. If — "Já Passou o Tempo Mínimo?"
   Última mensagem tem 30+ dias (tempo de descanso mínimo, ajustável)

5. HTTP Request (GET) — "Revalidar Estado do Lead3" + If "Ainda em
   Descanso?" (confirma que nada mudou nesse meio-tempo)

6. HTTP Request (GET) — "Recuperar Histórico Completo" (todas as mensagens)
   + Aggregate — "Agrupar Histórico Completo" (junta os itens num só)

7. Basic LLM Chain — "Gerar Reativação com IA"
   ├─ sub-nó "Google Gemini Chat Model4"
   └─ sub-nó "Estrutura da Resposta3" (schema: mensagem, angulo)
   Prompt System = mesma metodologia dos outros workflows. Prompt User =
   dados do prospect + histórico completo da tentativa anterior + instrução
   explícita de usar um ângulo genuinamente novo, não repetir o gancho.

8. If — "Mensagem de Reativação Válida?" (checagem defensiva)

9. HTTP Request (POST) — "Registrar Mensagem de Reativação"
   Reaproveita o conversation_id da última mensagem, sent_at em branco

10. HTTP Request (PATCH) — "Reativar Lead"
    status='WAITING_RESPONSE', automation_enabled=true

11. HTTP Request (POST) — "Registrar Ciclo de Reativação"
    event_type='FOLLOW_UP_SENT' (reaproveitado — não existe um valor
    dedicado a "reativação" no enum do banco; o payload inclui
    `tipo: 'reativacao'` pra diferenciar de um follow-up comum no histórico)
```

## 3. Decisão de design: por que `WAITING_RESPONSE`, não `READY_FOR_OUTREACH`

Diferente do Workflow 1 (que só cria o lead com `READY_FOR_OUTREACH` pro
Workflow 2 gerar a 1ª mensagem depois), o Workflow 6 já gera a mensagem de
reativação ele mesmo — então o lead vai direto pra `WAITING_RESPONSE`
(esperando resposta), sem passar de novo pelo Workflow 2 (que geraria uma
mensagem de "1º contato" redundante e sem contexto do histórico).

## 4. Teste

Lead de teste criado com `status=RESTING`, `automation_enabled=false`, e um
histórico de 3 mensagens antigas (40, 37 e 35 dias atrás, simulando o ciclo
de follow-up que já esgotou). Intervalo do Schedule Trigger reduzido pra
1 min só durante o teste (voltou pra 30 min depois).

**Resultado confirmado**: a IA gerou uma mensagem de reativação com ângulo
claramente diferente das 3 tentativas anteriores (trocou o gancho de
"gestão de visitas por planilha" para "velocidade de atendimento após
expansão de portfólio"), mantendo a metodologia (pattern interrupt
específico, dois horários concretos, espaço para o não). Lead reativado
corretamente (`WAITING_RESPONSE`, automação ligada), evento registrado.
Dados de teste removidos do Supabase depois da verificação.

## 5. Status do CLAUDE.md após este workflow

Com o Workflow 6 pronto, todos os workflows de automação do CLAUDE.md
(Fases 1-9) estão construídos e testados. Falta:
- Fase 10 (observabilidade — parcialmente já coberta pelos eventos em
  `automation_events`, mas sem dashboard/alertas formais).
- O envio de verdade (Evolution API) em todos os workflows que geram
  mensagem (2, 3, 6) — depende de decisão futura de como/quando conectar.
- O trabalho de deploy/hospedagem do Prospec.IA, combinado para depois
  dessa sequência.
