# Pipeline de Prospecção (Método Sobral) — Design

**Status**: Aprovado em chat 2026-08-21
**Aprovação**: usuário aprovou o desenho apresentado em chat (estágios automáticos, dicas por estágio, badges na lista, reforço nos prompts) e confirmou implicitamente ao perguntar por que a tela ainda não mudara.

## 1. Visão geral

Hoje o app tem um único campo de "estágio" — `estagio`/`estagioAtual` — gerado pela IA a cada mensagem, respondendo "como está o clima da conversa" (frio, curioso, com objeção...). Isso é útil para calibrar o *tom* da próxima mensagem, mas não responde "onde estou no meu processo de prospecção" (já abordei? quantos follow-ups já mandei? já vale desistir?).

O material do Pedro Sobral (M3A04 — Fluxo de interação, prospecção e follow-up) define exatamente esse segundo eixo: uma progressão mecânica, guiada por contagem de mensagens e presença/ausência de resposta, não por interpretação psicológica. Este design adiciona esse segundo eixo **sem duplicar dados** — ele é inteiramente calculado a partir do histórico que já é salvo.

## 2. Modelo de estágios do pipeline

Calculado por `src/services/pipeline.js`, função pura `computePipelineStage(prospect)`, onde `prospect` tem `.historico` (array de `{data, tipo, conteudo}`) e `.analises` (array de análises salvas).

**Regra**: se não há nenhuma mensagem `incoming` no histórico, o estágio vem da contagem de mensagens `outgoing`. Se há pelo menos uma `incoming`, o estágio vem do campo `estagioAtual` (ou `estagio`, para a primeira análise) da análise mais recente, mapeado para um "balde" fixo.

| id | Rótulo | Condição | Dica (fonte: M3A03/M3A04) |
|---|---|---|---|
| `abordado` | Abordado | 0-1 outgoing, 0 incoming | Aguarde alguns dias antes do 1º follow-up. |
| `em_followup` | Em Follow-up (N/5) | 2-5 outgoing, 0 incoming | Envie o próximo follow-up — considere trocar de canal (ex: Instagram → WhatsApp). |
| `sem_resposta` | Sem Resposta | 6+ outgoing, 0 incoming | 5+ follow-ups sem resposta é esperado no método — deixe descansar e tente reabordar mais adiante, ou peça indicação a outro contato. |
| `engajado` | Engajado | ≥1 incoming, última análise não cai em nenhum balde abaixo | Prospect respondeu! Continue a conversa e qualifique a necessidade. |
| `com_objecao` | Com Objeção | última análise = "com objeção" | Neutralize a objeção diretamente, sem ignorar. |
| `negociacao` | Em Negociação | última análise = "em negociação" ou "perto do fechamento" | Foque em remover os últimos obstáculos e marcar o próximo passo concreto. |
| `parado` | Parado | última análise = "parado" | Crie uma razão legítima e específica para voltar a falar — evite follow-up genérico. |
| `perdido` | Perdido | última análise = "perdido" | Recusou. Puxe o script de pedir indicação — uma recusa pode virar uma indicação. |

`computePipelineStage` retorna `{ stage, label, tip, followUpCount }`. `followUpCount` = número de mensagens `outgoing` antes da primeira `incoming` (ou total de outgoing, se nunca respondeu) — sempre calculado, mesmo pós-engajamento, para histórico/exibição futura.

## 3. Onde os dados entram e saem

- **`storage.js`**: nova função `getAllProspectsWithPipeline()` — lê o índice e, para cada prospect, também lê `history.json5`/`analyses.json5` (I/O puro, sem lógica de estágio — mantém a separação existente entre storage e regra de negócio).
- **`routes/api.js`**:
  - `GET /prospects` passa a chamar `getAllProspectsWithPipeline()`, mapear cada item com `computePipelineStage()`, e devolver `{ ...camposExistentes, pipeline: {...} }` (sem `historico`/`analises` brutos — mantém o payload leve).
  - `GET /prospect/:id` passa a incluir `pipeline: computePipelineStage(prospect)` na resposta existente.
- **`ai.js` (`buildContinuePrompt`)**: computa o pipeline do `prospectContext` recebido (estado *antes* da resposta atual) e, se o estágio for `em_followup` ou `sem_resposta`, injeta uma instrução extra no prompt pedindo pra IA sugerir troca de canal explicitamente.

## 4. Frontend

- **Aba renomeada**: "📋 Continuar Conversa" → "📊 Pipeline" (`index.html` + `app.js`, o `data-tab` interno continua `continuar-conversa` para não quebrar nada — só o rótulo visível muda).
- **Lista de prospects**: cada card ganha um badge de estágio (reaproveita `.stage-badge`, com variante de cor por estágio: `perdido`→vermelho, `negociacao`→verde, `sem_resposta`→amarelo, resto→azul padrão).
- **Filtro por status**: o dropdown `#filterStatus` (existe no HTML, nunca foi ligado) passa a listar os 8 estágios do pipeline e filtrar a lista de fato — funcionalidade nova, não só estética.
- **Busca por texto**: `#searchProspect` (também existe, nunca foi ligado) passa a filtrar por nome da empresa/contato — pequeno extra de baixo custo já que o campo está ali sem uso.
- **Banner de dica**: ao selecionar um prospect, aparece uma faixa com `pipeline.tip` antes do histórico de conversa.

## 5. Reforços no prompt (M3A03 — princípios de abordagem)

Adicionados a `METODOLOGIA` em `ai.js`:
- Nunca fabricar prova social/números não informados (reforça um bug real já visto com outro modelo).
- Nunca abrir com "tudo bem?" — soa como telemarketing.
- Ao propor conversa/reunião, sempre oferecer duas opções específicas de dia/horário, nunca convite aberto.
- Incluir um "espaço para o não" explícito, para baixar a fricção de resposta.

## 6. Testes

- `tests/pipeline.test.js`: cobre todas as 8 combinações de estágio, contagem de follow-up, e o mapeamento de `estagioAtual`/`estagio` (incluindo o caso de nunca ter analisado — `analises` vazio pós-resposta, o que não deveria acontecer na prática mas a função não deve quebrar).
- `tests/api.test.js`: acrescenta um caso — depois de `saveProspect`, `GET /prospects` inclui `pipeline.stage === 'abordado'`.
- `tests/ai.test.js`: acrescenta um caso — `buildContinuePrompt` inclui a instrução de troca de canal quando o histórico já tem outgoing sem resposta.

## 7. Fora de escopo (explicitamente, por decisão do usuário)

- Estágios anteriores a "Abordado" (Encontrado, Pesquisado) — não entram no app agora.
- Atualização manual de estágio — tudo é calculado, sem campo editável.
- Segunda aba/dashboard separado — a mudança acontece dentro da aba existente.
