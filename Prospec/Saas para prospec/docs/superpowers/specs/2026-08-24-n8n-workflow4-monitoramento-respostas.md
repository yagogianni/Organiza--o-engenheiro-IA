# n8n Workflow 4 — Monitoramento de Respostas — Design

**Status**: Aprovado em chat 2026-08-23/24. Testado e funcionando (2026-08-24).

## 1. Visão geral

Quarto workflow de automação do `CLAUDE.md` (seção "WORKFLOW 4 — MONITORAMENTO
DE RESPOSTAS"), construído no mesmo workflow `Prospec` (id
`9fcpOvu92gPv3THi`). É o primeiro workflow orientado por webhook (não por
formulário nem agendamento): reage em tempo real quando o Evolution API
avisa que chegou uma mensagem no WhatsApp conectado.

Diferente dos Workflows 2/3, este **envia de verdade** — não a mensagem em
si (isso continua manual, decisão do humano), mas ele já realiza ações reais
e imediatas no banco (pausar automação, mudar status), porque a regra
crítica do CLAUDE.md exige isso acontecer sem atraso.

## 2. Evolution API — conexão e webhook

- Instância: "Prospec" (WhatsApp pessoal do usuário, conectado e ativo,
  ~1.500 contatos reais — **não é um número de teste**).
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` salvos no
  `.env` (gitignored).
- Webhook configurado via `POST /webhook/set/Prospec` do próprio Evolution
  API, apontando pra `{N8N_API_URL}/webhook/evolution-incoming`, evento
  `MESSAGES_UPSERT`, `webhookByEvents: false` (um endpoint só recebe tudo,
  filtragem acontece dentro do n8n).
- **Aviso de privacidade**: como é a conta pessoal real do usuário, todo
  tráfego de WhatsApp dele (grupos, conversas pessoais) passa por esse
  webhook. Nada disso é gravado no Supabase — só é processado adiante se o
  remetente bate com um telefone já cadastrado na tabela `leads` (ver passo
  4 do fluxo). Mas o conteúdo bruto de qualquer mensagem passa pelo n8n e
  fica visível no histórico de execuções por um tempo, mesmo quando
  descartada.

## 3. Fluxo (17 nós principais + 2 sub-nós de IA)

```
1. Webhook Trigger — "Evolution Webhook" (path: evolution-incoming)

2. If — "É Mensagem Recebida de Texto?"
   fromMe == false E messageType == 'conversation'
   (ignora mensagens que nós mesmos mandamos e mídia/status/grupo)

3. Edit Fields — "Extrair Dados"
   telefone (do remoteJid), mensagem (texto), mensagemId (key.id)

4. HTTP Request (GET) — "Identificar Lead"
   Busca em leads por telefone terminando nos mesmos 8 últimos dígitos do
   remetente (contorna diferença de código de país 55 no telefone salvo)

5. If — "É um Lead Nosso?"
   Só segue se achou um lead — qualquer coisa fora disso (vida pessoal do
   usuário) para aqui, sem tocar no banco

6. HTTP Request (GET) — "Verificar Duplicidade"
   Busca em messages por external_message_id igual ao da mensagem recebida

7. If — "Ainda Não Registrada?"
   Se já existe (Evolution reenviou o mesmo evento), para aqui

8. HTTP Request (GET) — "Buscar Conversa" (a mais recente do lead)

9. HTTP Request (POST) — "Registrar Mensagem Recebida"
   direction='INBOUND', channel='whatsapp', external_message_id salvo

10. HTTP Request (PATCH) — "Pausar Automação AGORA"
    automation_enabled=false — ANTES de qualquer análise de IA (regra
    crítica do CLAUDE.md: nunca deixar um follow-up sair enquanto a IA
    ainda está processando a resposta)

11. HTTP Request (GET) — "Recuperar Histórico" (todas as mensagens do lead)

12. Aggregate — "Agrupar Histórico"
    Junta as N mensagens (que chegam como N itens separados) num item só,
    necessário pra poder montar o histórico completo no prompt da IA

13. Basic LLM Chain — "Classificar Resposta com IA"
    ├─ sub-nó "Google Gemini Chat Model3"
    └─ sub-nó "Estrutura da Classificação" (schema: classificacao, resumo,
       sugestaoResposta)
    Classifica em: INTERESTED, ENGAGED, QUESTION, OBJECTION, NOT_INTERESTED,
    AUTO_REPLY, UNKNOWN — igual à lista do CLAUDE.md.

14. If — "É Não Interessado?" → HTTP PATCH "Marcar Não Interessado"
    (status='NOT_INTERESTED')

15. Se não: If — "É Interesse Real?" (INTERESTED/ENGAGED/QUESTION/OBJECTION)
    → HTTP PATCH "Marcar Prioridade (HUMAN_REVIEW)" (status='HUMAN_REVIEW')
    Se não (AUTO_REPLY/UNKNOWN): não muda status, automação já ficou pausada
    no passo 10 mesmo assim (CLAUDE.md: "não pausar definitivamente a
    sequência sem regra específica" — aqui interpretado como: fica pausado,
    mas não vira prioridade de HUMAN_REVIEW)

16. HTTP Request (POST) — "Registrar Evento de Resposta"
    event_type='RESPONSE_RECEIVED', payload com a classificação completa
```

## 4. Bugs encontrados e corrigidos durante o teste

- **Switch node com 3º caminho (`fallbackOutput`) não funcionou** — o item
  simplesmente sumiu quando não batia com nenhuma das 2 regras explícitas,
  mesmo definido. Sem conseguir confirmar o schema certo sem acesso à UI,
  troquei por dois nós "Se" encadeados (padrão já comprovado em todo o
  resto do projeto) em vez de insistir no Switch.
- **Histórico de mensagens vinha em itens separados, não uma lista** — o
  `Recuperar Histórico` devolve uma mensagem por item (mesmo comportamento
  já visto nos Workflows 2/3), então o prompt da IA não via nada. Resolvido
  com o nó "Aggregate", que junta tudo num item só antes de montar o prompt.

## 5. Notificação no Telegram (2026-08-24)

Quando o lead vira `HUMAN_REVIEW`, o nó "Notificar no Telegram" (HTTP
Request pro `sendMessage` do Bot API do Telegram, token embutido igual ao
padrão do Supabase) manda uma mensagem com empresa, contato, telefone, o
que o lead respondeu, a classificação e a sugestão de resposta da IA — pro
chat privado do usuário (bot "Prospec.IA Alertas" / `@Prospec_Alertas_bot`).
Token e chat_id salvos no `.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` —
o chat_id foi obtido via `GET /getUpdates` da Bot API, depois do usuário
mandar uma mensagem qualquer pro bot).

Bug real encontrado e corrigido: o texto da notificação tem `\n` (quebra de
linha) várias vezes — escrever isso à mão dentro do JSON do node causou uma
camada de escape a menos (`\n` virou quebra de linha real no arquivo, em vez
de continuar como os dois caracteres `\` `n`), quebrando a sintaxe do
JavaScript que o n8n tenta avaliar. Resolvido gerando o node inteiro por
script (Node.js), usando `String.fromCharCode(92)` pra montar o caractere de
barra invertida sem ambiguidade, em vez de escrever `\n` à mão em um
arquivo-texto.

## 6. Fora de escopo

- Envio automático de resposta — mesmo em `HUMAN_REVIEW`, o CLAUDE.md é
  explícito: "o sistema NÃO deve responder automaticamente." A sugestão de
  resposta fica registrada no evento e na notificação, pronta pra você usar.
- Reativação de leads `RESTING` — isso é o Workflow 6.

## 7. Teste

Simulei mensagens recebidas via POST direto no webhook do n8n (mesmo
formato que o Evolution manda de verdade, confirmado com uma mensagem real
antes do teste), pra leads de teste com histórico:

- Mensagem demonstrando interesse ("Sim, tenho interesse, pode me mostrar
  como funciona? Qual o valor?") → classificação `INTERESTED`, lead virou
  `HUMAN_REVIEW`, automação pausada, evento registrado com sugestão de
  resposta.
- Mensagem de recusa ("Não tenho interesse, não me contate mais") → lead
  virou `NOT_INTERESTED`.
- Mensagem com dúvida ("Interessante! Como funciona o processo, e qual o
  investimento?") → classificação `QUESTION`, lead virou `HUMAN_REVIEW`, e a
  notificação chegou de verdade no Telegram do usuário (confirmado por ele).
- Confirmado que tráfego real do WhatsApp pessoal do usuário (grupo e
  conversas próprias) é corretamente filtrado antes de tocar em qualquer
  lead — várias execuções reais pararam em "É um Lead Nosso?" ou antes,
  inclusive durante os testes acima.

Dados de teste removidos do Supabase depois da verificação.
