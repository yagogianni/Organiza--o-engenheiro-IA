# Canal de E-mail (Fase 11) — Spec

**Status:** ABANDONADA em 2026-09-09. Descoberto que outra sessão já tinha
construído e "enviado" esse canal via Brevo SMTP (não Gmail direto como
essa spec propunha) em 2026-08-29, restrito a leads de nicho clínica — mas
nunca rodou de verdade porque nenhum lead teve e-mail cadastrado até hoje.
O usuário decidiu remover o canal de e-mail inteiramente ("vamos tirar o
email pq ele não vai lidar tão bem em prospecção, muita burocracia
também") em vez de terminar/testar. Todos os nós de n8n e código
relacionados (Brevo SMTP, `sendEmailMessage`, `nodemailer`) foram
removidos. Prospec.IA volta a ser WhatsApp-only. Esta spec fica só como
registro histórico do raciocínio (Gmail vs Brevo, aquecimento, etc.), não
representa mais o estado ou os planos do projeto.
**Data:** 2026-09-03

## Contexto

O Prospec.IA hoje só prospecta por WhatsApp. O usuário quer adicionar e-mail
como um segundo canal automático, rodando em paralelo com o WhatsApp para o
mesmo lead — não como substituto, não como fallback condicional. Se o lead
tem e-mail cadastrado, ele recebe as duas frentes.

Decisões já tomadas com o usuário, nesta ordem (a segunda revoga a primeira):

1. ~~E-mail com revisão manual antes de enviar~~ — revogado.
2. **E-mail 100% automático, mesmo padrão do WhatsApp**: a IA gera e o
   sistema envia sozinho, sem revisão humana no primeiro contato.
3. Envio direto pelo Gmail do usuário (SMTP + senha de app), não pelo Brevo
   — evita o problema de autenticação de domínio (Brevo tentando mandar como
   se fosse `@gmail.com` cai em spam; o Gmail mandando por si mesmo, não).
4. Volume diário conservador para "aquecer" o remetente aos poucos.

## Objetivo

Quando um lead tem e-mail cadastrado, o mesmo ciclo automático que hoje gera
e envia a mensagem de WhatsApp deve, em paralelo, gerar e enviar um e-mail de
abordagem (assunto + corpo) — sem intervenção manual, com um limite diário
para não queimar a reputação de um remetente novo.

## Fora de escopo (explicitamente, para não inflar esta spec)

- Follow-ups por e-mail (Workflow 3 hoje só cobre WhatsApp) — pode ser uma
  Fase 11.1 depois que o canal básico estiver rodando e validado.
- Reativação por e-mail (Workflow 6) — mesma lógica, depois.
- Monitoramento de respostas por e-mail (equivalente ao Workflow 4) — receber
  e classificar respostas de e-mail é um projeto à parte; por ora, respostas
  de e-mail exigem checar a caixa de entrada manualmente.
- O buscador de leads via Google Maps (skill separado, brainstorm próprio).
- Domínio próprio / Brevo com domínio verificado — fica como upgrade futuro
  se o volume crescer além do que o Gmail pessoal aguenta.

## Modelo de dados

Nenhuma migração grande. Duas mudanças:

- `conversations.channel` e `messages.channel` já existem mas estão
  hardcoded como `'manual'` em todo lugar (app e n8n) — passam a ser usados
  de verdade: `'whatsapp'` ou `'email'`. Isso corrige também um bug latente:
  o Motor de Envio do WhatsApp hoje não filtra por canal, então mensagens de
  e-mail cairiam na fila errada e quebrariam o envio por Evolution API.
- Nova coluna `messages.subject` (text, nullable) — só preenchida em
  mensagens de e-mail.

Um lead pode ter uma `conversations` de WhatsApp e uma de e-mail,
independentes (mesmo `lead_id`, `channel` diferente).

## Geração (IA)

Novo 4º nó de IA no workflow "Prospec" do n8n, `Gerar Email com IA`, mesmo
padrão dos 3 já existentes (Basic LLM Chain + Chat Model + Structured Output
Parser, System/User split). Reaproveita a mesma `OFERTA`/`METODOLOGIA` já
validada, com adições específicas de e-mail:

- Precisa de assunto (curto, específico, sem soar spam/genérico).
- Corpo pode ser um pouco mais estruturado que o WhatsApp (ainda 2-4
  parágrafos curtos, sem virar carta comercial longa).
- Mesmas regras de sempre: sem "tudo bem?", sem travessão, fechamento
  afirmativo com horário variado, sem inventar prova social.

Fica no mesmo `Workflow 1` (intake), rodando junto com `Gerar Mensagem com
IA`: ao processar um lead `READY_FOR_OUTREACH` a cada 30 min (mesmo
schedule trigger `Verificar Leads Prontos` que já existe), se o lead tiver
`email` preenchido, gera e staia (`messages`, `channel:'email'`,
`sent_at:null`) o e-mail junto com a mensagem de WhatsApp.

## Envio

Novo workflow "Motor de Envio de E-mail" (mesma banda única do workflow
"Prospec", nova faixa Y), espelhando o `Motor de Envio` do WhatsApp:

- Schedule trigger a cada 30 min (mais devagar que os 10 min do WhatsApp, de
  propósito, para aquecimento).
- Busca `messages` com `channel=eq.email&sent_at=is.null&direction=eq.OUTBOUND`,
  limitado a um teto diário configurável (sugestão inicial: 10-15/dia —
  contabilizado contando quantos e-mails já saíram nas últimas 24h antes de
  processar o lote).
- Revalida `automation_enabled` do lead antes de enviar (mesma regra crítica
  do WhatsApp).
- Envia via node nativo de e-mail do n8n (SMTP, credencial Gmail com senha de
  app) — não HTTP Request genérico, já que existe node dedicado.
- Marca `sent_at` no sucesso.

O `Motor de Envio` do WhatsApp ganha um filtro `channel=eq.whatsapp` na
query (correção, não regressão — hoje já funciona por não existir e-mail
nenhum staged ainda).

## Dashboard

- "Nova Prospecção": novo campo "E-mail" (opcional — nem todo lead tem).
- Visualização de um lead ganha duas abas: "WhatsApp" (como já existe hoje)
  e "E-mail" (nova) — cada uma com seu próprio histórico de mensagens,
  filtrado por `channel`.
- Painel "Todos os Leads": sem mudança estrutural, mas o indicador de status
  pode futuramente diferenciar canal (fora de escopo agora).

## Configuração necessária

- Senha de app do Gmail (`fluxodigitalsc@gmail.com`) — gerada em
  myaccount.google.com → Segurança → Verificação em duas etapas → Senhas de
  app. Guardada como credencial SMTP no n8n, não em texto puro em nenhum
  node.
- Nenhuma dependência do Brevo nesta fase (as credenciais SMTP do Brevo já
  compartilhadas ficam registradas em `.env` para uso futuro, caso um
  domínio próprio seja registrado depois).

## Testes

Mesmo processo já estabelecido no projeto: lead sintético via formulário do
n8n com e-mail de teste, sender de e-mail e de WhatsApp desligados durante o
teste, geração conferida, envio conferido via inspeção da caixa de saída/
Gmail, lead de teste apagado ao final. Suite `node --test` cobrindo a
normalização de canal e a nova coluna `subject`.
