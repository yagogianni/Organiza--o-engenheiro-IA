# Fase 10 — Observabilidade — Design

**Status**: Aprovado em chat 2026-08-24/25. Testado e funcionando (2026-08-25).

## 1. O que já existia (documentado, não construído de novo)

### Logs e auditoria

O CLAUDE.md pede que toda ação importante gere um evento e que dá pra
responder: quem enviou, qual workflow, quando, qual estratégia, qual
resposta foi recebida, por que a automação foi pausada. Isso já está
coberto por dois lugares complementares, sem precisar de nada novo:

- **`automation_events`** (Supabase) — registra eventos de negócio:
  `LEAD_CREATED` (Workflow 1), `RESPONSE_RECEIVED` com a classificação da IA
  (Workflow 4), `FOLLOW_UP_SENT` reaproveitado pra reativação (Workflow 6).
- **Histórico de execuções do n8n** — cada execução guarda o resultado
  completo de cada nó, incluindo o prompt exato mandado pra IA, a resposta
  recebida, e qualquer erro — é o que usei o tempo todo pra depurar cada
  workflow construído nesta sessão.

### Proteção contra duplicidade

Já existe em cada workflow, sem necessidade de nada adicional:
- Workflow 1: dedup por telefone (atualiza em vez de duplicar).
- Workflow 4: dedup por `external_message_id`.
- Workflows 2/3/6: avançam o `status` do lead ao processar, então o próprio
  gatilho seguinte não pega o mesmo lead de novo.

## 2. O que foi construído: alerta de erro

Único item genuinamente novo desta fase. Workflow separado
**"Prospec - Tratamento de Erros"** (id `3Dl3v9R3aPezCvr3`), com:

```
1. Error Trigger (recurso nativo do n8n — dispara sozinho sempre que
   QUALQUER execução do workflow "Prospec" falha, sem precisar
   instrumentar nó por nó)
2. HTTP Request → Telegram (mesmo bot "Prospec.IA Alertas")
   Manda: nome do workflow, nó onde falhou, mensagem de erro, link direto
   pra execução no n8n
```

Ligado ao workflow "Prospec" via `settings.errorWorkflow` (configuração
nativa do n8n, não uma solução improvisada).

**Teste**: com autorização explícita do usuário, invalidei de propósito a
credencial de um nó de leitura (GET, sem efeito colateral mesmo falhando),
disparei uma execução real, confirmei que o erro aconteceu (execução com
status `error`) e que o alerta chegou no Telegram do usuário. Credencial
restaurada imediatamente depois.

## 3. Incidente durante os testes (2026-08-24) e correção de processo

Durante um teste anterior (mudança de posicionamento da oferta, ver
`docs/.../2026-08-24-...` — commit da oferta), uma mensagem de teste foi
enviada de verdade para um número desconhecido. Causa raiz: o "Motor de
Envio" (workflow que manda mensagem de verdade pelo WhatsApp, construído
mais cedo na mesma sessão) ficou ativo o tempo todo em segundo plano,
rodando a cada 10 min e processando *qualquer* mensagem pendente no banco
— sem diferenciar lead de teste de lead real. Uma mensagem de teste gerada
pra validar o prompt ficou pendente por alguns minutos até a limpeza, e
nesse intervalo o Motor de Envio a pegou e enviou de verdade.

**Correção de processo (não é uma mudança de código, é uma regra de
operação)**: o Motor de Envio deve ficar **desligado** sempre que qualquer
teste de geração de mensagem (Workflow 2/3/6) estiver em andamento, e só
ser reativado quando não houver risco de lead de teste pendente no banco.
Está desligado agora (nó de agendamento com `disabled: true`) e só deve
voltar quando o usuário decidir.

## 4. Fora de escopo

- Dashboard formal de observabilidade — os dados já existem
  (`automation_events` + execuções do n8n), mas não há uma tela dedicada
  pra visualizar isso; fica pra quando/se fizer falta.
- Confirmação de entrega/leitura do WhatsApp — o Motor de Envio só marca
  que o envio foi aceito pelo Evolution API, não que foi lido.
- Um jeito automático de impedir que dados de teste entrem no fluxo de
  envio real (hoje é uma regra de processo/disciplina, não uma trava no
  código) — poderia virar uma flag `is_test` na tabela `leads` no futuro,
  se esse tipo de incidente se repetir.
