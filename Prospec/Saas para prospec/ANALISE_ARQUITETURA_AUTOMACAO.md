# Análise Fase 1 — Arquitetura Atual vs. Prospec.IA + Automation Engine

**Status**: Documento de análise, conforme exigido pelo `CLAUDE.md` (seção "ARQUITETURA DE DADOS") antes de qualquer alteração estrutural.
**Data**: 2026-08-21

---

## 1. Arquitetura atual

- **Stack**: Node.js (ESM) + Express 4. Frontend em HTML/CSS/JS puro, sem framework, sem build step — servido como arquivo estático pelo próprio Express.
- **IA**: Google Gemini (`gemini-3.5-flash-lite`), via `@google/genai`, chamada síncrona dentro da requisição HTTP (o usuário espera a resposta na hora).
- **Persistência**: arquivos `JSON5` em disco, pasta `data/`. Sem banco de dados, sem ORM.
  - `data/prospects.json5` — índice resumido de todos os prospects.
  - `data/[id]/metadata.json5` — dados da empresa/contato.
  - `data/[id]/history.json5` — mensagens (outgoing/incoming).
  - `data/[id]/analyses.json5` — análises da IA por data.
- **Autenticação**: nenhuma. Single-tenant, single-user, roda local na máquina do usuário.
- **Processo**: um único processo Node (`npm start` ou o `.bat` launcher). Sem fila, sem scheduler/cron, sem worker separado.
- **Canais externos**: nenhum. O app não envia mensagem nenhuma sozinho — WhatsApp/Instagram/e-mail são 100% manuais, fora do app (o usuário copia a mensagem gerada e cola no canal real).
- **"Pipeline" atual**: o estágio (Abordado, Em Follow-up, Engajado etc.) não é um campo salvo — é **calculado on-the-fly** a cada leitura, a partir do `history.json5` (quantas mensagens outgoing antes da 1ª incoming, e a última análise salva).

## 2. Fluxo atual dos dados

**Nova Prospecção:**
```
Form → POST /api/analyze → valida → (opcional) lê o site → chama Gemini
     → salva metadata + history + 1ª analysis em disco → atualiza índice → retorna
```

**Continuar Conversa:**
```
Usuário cola resposta → POST /api/continue → lê histórico completo do disco
     → chama Gemini com o histórico inteiro como contexto → salva nova entrada
     no history + nova analysis → retorna
```

**Listagem/Pipeline:**
```
GET /api/prospects → lê índice + history/analyses de cada prospect do disco
     → calcula o estágio na hora → retorna já com o estágio calculado
```

Ponto central: **nada acontece sem uma requisição HTTP explícita disparada pelo usuário clicando em algo**. Não existe nenhum processo rodando em segundo plano.

## 3. Limitações para integração com n8n

| Limitação | Por quê importa |
|---|---|
| **Sem lock/transação nos arquivos** | Dois processos escrevendo o mesmo `.json5` ao mesmo tempo (ex: n8n gravando um evento enquanto o app grava uma resposta) podem corromper o arquivo ou perder dado — viola diretamente a regra de concorrência que o próprio `CLAUDE.md` exige ("revalidar estado antes de agir"). |
| **API não é genérica** | As rotas atuais (`/api/analyze`, `/api/continue`, `/api/prospects`, `/api/prospect/:id`) foram desenhadas só pras duas telas existentes — não dá pro n8n, por exemplo, só marcar `automation_enabled = false` sem reimplementar lógica de negócio. |
| **Sem webhook receiver** | Nada escuta mensagem chegando de canal externo — hoje é 100% o humano que cola a resposta na tela. |
| **Sem scheduler** | Não existe `next_action_at` nem cron — follow-up só acontece quando o usuário decide clicar em "Analisar e Continuar". |
| **Sem modelo de eventos/auditoria** | Não existe nada equivalente a `AutomationEvent` — hoje só existem os 3 arquivos por prospect, sem rastro de "quem fez o quê, quando, por quê". |
| **Estágio é calculado, não persistido** | O novo modelo pede estados controlados e persistidos (`status`, `automation_enabled`, `follow_up_count`, `next_action_at`) — hoje isso é 100% derivado na leitura, não existe como campo gravável. |
| **Processo único assume ser o único escritor** | Todo o `storage.js` foi escrito assumindo que só ele grava nos arquivos. Com n8n escrevendo no mesmo lugar, essa suposição quebra. |

**Ponto positivo**: `src/services/storage.js` já é a **única** camada que lê/escreve dados no projeto inteiro — rotas e IA nunca tocam no disco diretamente. Isso significa que trocar "arquivo JSON5" por "banco de dados central" é uma mudança **isolada e incremental**: só esse arquivo muda de implementação, o resto do sistema (rotas, prompts, frontend) não precisa saber a diferença.

## 4. Proposta de arquitetura futura (recomendação, não decisão final)

```
┌─────────────┐        ┌──────────────────┐        ┌──────────┐
│  Prospec.IA │◄──────►│  Banco de Dados   │◄──────►│   n8n    │
│  (Express)  │  REST  │  Central (fonte   │  REST/ │  (motor  │
│  Dashboard  │        │  de verdade)      │  SQL   │  operac.)│
└─────────────┘        └──────────────────┘        └────┬─────┘
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │ WhatsApp/    │
                                                   │ Email/       │
                                                   │ Instagram    │
                                                   └──────────────┘
```

- **Banco central**: recomendo Postgres via **Supabase** — já é uma skill instalada no ambiente, tem tier gratuito, dá auth/realtime de graça (útil pro dashboard "quase tempo real" que o `CLAUDE.md` pede), e o n8n tem nó nativo pra Postgres/Supabase. **Precisa de autorização sua** (o MCP do Supabase está instalado mas não autenticado ainda).
- **`storage.js` é substituído**, não o app inteiro — as funções (`saveProspect`, `getProspect`, `addToHistory` etc.) passam a falar com o Postgres em vez de arquivo. Rotas, prompts e frontend continuam iguais no início.
- **API ganha rotas novas** voltadas pro n8n (ex: `PATCH /api/leads/:id/automation`, `POST /api/events`) além das que já existem pro humano.
- **n8n**: precisa rodar em algum lugar — self-hosted (Docker, VPS) ou n8n Cloud. **Decisão e custo são seus.**
- **Canais (WhatsApp/Instagram/e-mail)**: cada um é uma integração e conta separada com um provedor externo (Meta Business API pra WhatsApp/Instagram — não é gratuito nem trivial de aprovar; um provedor de e-mail tipo Resend/SendGrid). **Isso reverte a regra original do projeto ("sem serviços pagos") — vale confirmar que essa mudança é intencional.**

## 5. Plano de migração (conforme fases do `CLAUDE.md`)

| Fase | O que é | Depende de |
|---|---|---|
| 1 | Este documento | — |
| 2 | Definir banco, criar schema, migrar dados existentes de `data/*.json5` pro banco | Decisão: qual banco/hosting |
| 3 | Trocar `storage.js` pra falar com o banco, mantendo a API atual funcionando igual | Fase 2 |
| 4-9 | Workflows do n8n (ingestão, outreach, follow-up, monitoramento, handoff, reativação) | n8n rodando + Fase 3 pronta + APIs de canal configuradas |
| 10 | Observabilidade, testes de concorrência, idempotência | Tudo anterior |

**Recomendação de ordem**: Fases 2-3 primeiro (dão valor sozinhas — o Prospec.IA já fica mais robusto, multi-dispositivo, com dados seguros contra concorrência, mesmo antes do n8n existir). Automação de envio (Fases 4+) só depois, porque depende de decisões externas (canal, hosting do n8n) que ainda estão em aberto.
