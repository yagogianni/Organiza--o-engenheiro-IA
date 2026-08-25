# n8n Motor de Envio — Design

**Status**: Aprovado em chat 2026-08-24. Testado e funcionando (2026-08-24) — primeiro envio real via WhatsApp confirmado.

## 1. Visão geral

Workflow que fecha o ciclo dos Workflows 2, 3 e 6: eles geram e registram
mensagens como pendentes (`sent_at=null`); este workflow acha essas
pendências e envia de verdade pelo Evolution API, ao invés de cada um dos
três duplicar a lógica de envio.

**Aviso**: a partir da ativação deste workflow, qualquer mensagem pendente
existente (ou futura) é enviada de verdade pro WhatsApp do lead. Não é mais
um estágio "só simulado".

## 2. Fluxo (5 nós)

```
1. Schedule Trigger — "Verificar Mensagens Pendentes" (a cada 10 min)

2. HTTP Request (GET) — "Buscar Mensagens Pendentes"
   GET /rest/v1/messages?sent_at=is.null&direction=eq.OUTBOUND&
   order=created_at.asc&limit=10
   (limite de 10 por rodada — proteção contra rajada, ver seção 3)

3. HTTP Request (GET) — "Buscar Lead" (Always Output Data)

4. If — "Automação Ainda Ligada?"
   Revalida automation_enabled=true NA HORA do envio (regra crítica do
   CLAUDE.md — se o lead respondeu ou foi pausado entre a geração e agora,
   a mensagem NÃO sai)

5. HTTP Request (POST) — "Enviar pelo WhatsApp"
   POST {EVOLUTION_API_URL}/message/sendText/Prospec
   Número normalizado com código do país (55) se não vier já incluído
   Batching: 1 item por vez, 8s de intervalo entre envios (ver seção 3)

6. HTTP Request (PATCH) — "Marcar Como Enviada" (sent_at = agora)
```

## 3. Proteção contra bloqueio do WhatsApp

O Evolution API usa o protocolo do WhatsApp Web (não é API oficial) —
enviar muitas mensagens rápido é o padrão clássico que o WhatsApp associa a
spam e pode levar ao bloqueio do número. Duas proteções, por decisão
explícita do usuário ao levantar essa preocupação:

- **Lote pequeno por rodada**: no máximo 10 mensagens pendentes processadas
  a cada execução (mesmo que exista uma fila maior).
- **Intervalo entre envios**: o nó "Enviar pelo WhatsApp" usa batching
  (1 item por vez, 8 segundos de intervalo) — mesmo com várias mensagens
  pendentes na mesma rodada, elas saem espaçadas, não em rajada.

Trade-off consciente: uma fila grande demora mais pra esvaziar, mas é o
lado seguro.

## 4. Teste

Mensagem de teste enviada pra própria conta conectada (mais seguro que
testar contra um contato de terceiro): confirmado envio real (HTTP 201 do
Evolution API) e `sent_at` atualizado no Supabase após o ciclo do workflow.
Dados de teste removidos depois.

## 5. Fora de escopo / pendente

- Não há webhook de "delivery status" (confirmação de entrega/leitura) —
  o `sent_at` marca apenas que a chamada de envio foi aceita pelo Evolution
  API, não necessariamente que o WhatsApp confirmou entrega.
- `automation_events` não é atualizado por este workflow (os eventos de
  criação da mensagem já foram logados por quem gerou — Workflow 6, por
  exemplo). Se algum dia for necessário auditar "quando foi realmente
  enviada" separado de "quando foi gerada", falta esse evento dedicado.
