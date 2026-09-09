# Sourcing Automático de Leads — Spec

**Data:** 2026-09-09
**Status:** Aprovado pelo usuário, backend/dashboard já implementados
(ver `docs/superpowers/plans/2026-09-09-lead-sourcing-automatico.md`). O
fluxo de busca em si (n8n) ainda não foi construído.

## Contexto

O Prospec.IA hoje só cadastra leads de duas formas: manualmente pelo
formulário do dashboard, ou (mais raro) importados à mão. O usuário quer uma
terceira fonte, automática: todo dia, sozinho, o sistema busca empresas de
nichos configurados (clínica, dentista, fisioterapia, etc.) numa região
configurada, filtra as que parecem boas candidatas (baixa presença digital —
o problema que o usuário resolve) e as que têm celular (sem celular não dá
pra fazer outreach por WhatsApp), e cadastra até 10 por dia — um teto
deliberado pra não sobrecarregar o volume de outreach.

Essa ideia já tinha sido levantada numa sessão anterior e adiada
explicitamente como "um projeto totalmente separado". Esta spec é esse
projeto.

## Decisão de fonte de dados (histórico da idas e vindas, importante pra não repetir o mesmo caminho)

Três rodadas de decisão antes de fechar:

1. **Google Places API** (primeira escolha): dado mais completo
   (telefone, site, número de avaliações), mas exige conta de cobrança no
   Google Cloud.
2. **OpenStreetMap (Overpass API)** (primeira troca, pedido do usuário: "não
   quero ter gasto"): testado em tempo real contra "dentista em Blumenau,
   SC" — achou 91 dentistas cadastrados (cobertura boa), mas só 9 tinham
   telefone no formato de celular, e desses, 8 qualificariam pelos filtros
   de qualidade. Funciona, mas fica perto do teto de 10/dia com só 1 nicho
   ativo, e não tem sistema de avaliações.
3. **Google Places de novo** (segunda troca, usuário decidiu que a
   qualidade do dado valia o cadastro de cartão, contanto que travássemos
   uma cota pra zero gasto) → **abandonado de novo, definitivamente**, ao
   tentar configurar o faturamento: o Google Cloud pediu um **pré-pagamento
   único de R$150** antes de liberar a conta de cobrança pra essa região/
   tipo de conta (é reembolsável se a conta de Cloud Billing for encerrada,
   mas ainda é dinheiro parado, incompatível com "zero gasto"). A trava de
   cota resolveria o problema de uso contínuo, mas não evita essa exigência
   de depósito inicial - são coisas diferentes.

**Decisão final: OpenStreetMap.** Zero cartão, zero pré-pagamento, zero
risco de cobrança, pra sempre. Se num futuro a qualidade do dado se tornar
um problema real (poucos leads bons por muitos dias seguidos), a alternativa
Google Places fica documentada acima como opção a reconsiderar - mas dessa
vez sabendo do requisito de depósito inicial antes de propor de novo.

## Objetivo

Um novo band no workflow "Prospec" do n8n que roda 1x por dia, busca
candidatos no OpenStreetMap dentro dos nichos/região configurados pelo
usuário, aplica os filtros de elegibilidade e qualidade, e cadastra os
aprovados em `leads` com os mesmos valores (`status: 'READY_FOR_OUTREACH'`,
`automation_enabled: true`) que um lead manual recebe — a partir daí ele
entra no pipeline de outreach que já existe, sem nenhuma mudança lá.

A configuração (nichos ativos, região) e o resumo do dia já têm uma tela no
dashboard, implementada e testada — ver "Estado atual da implementação"
abaixo.

## Fora de escopo

- Medir tráfego pago real ou engajamento de Instagram/Facebook (não tem API
  gratuita confiável pra isso).
- Expandir a busca pra múltiplas cidades/regiões ao mesmo tempo num único
  ciclo — a região é uma só por vez, editável pelo dashboard quando o usuário
  quiser mudar.
- Um "score" numérico de prioridade entre os leads sourced — a lista de
  filtros abaixo é um corte binário (qualifica ou não), não um ranking.
- Um relatório detalhado de "por que cada candidato foi descartado" —
  o painel de status mostra só nicho do dia + quantos entraram hoje.
  Detalhamento de motivos de descarte é uma melhoria futura, não necessária
  pra v1.
- Nível de detalhe de avaliações/nota (rating) como critério de qualidade —
  o OpenStreetMap não tem sistema de avaliações.

## Limitações conhecidas do OpenStreetMap (o usuário já topou isso)

- **Cobertura menor**: o OSM depende de voluntários mapeando cada lugar.
  Cidades grandes costumam estar bem mapeadas; cidades pequenas/bairros
  específicos podem ter poucas empresas cadastradas num nicho, mesmo que
  existam várias na vida real.
- **Telefone nem sempre presente**: muitas entradas no OSM não têm o campo
  de telefone preenchido, mesmo quando a empresa existe e está bem
  localizada no mapa. Esses casos são tratados igual "sem celular" — pulados.
- **Sem sistema de avaliações**: o filtro de qualidade fica só em "tem site
  próprio ou não".
- **Nichos não são texto livre por baixo dos panos**: o OSM organiza
  negócios por tags estruturadas (ex.: `amenity=dentist`,
  `healthcare=physiotherapist`), não por busca de texto livre. Isso é
  resolvido com uma tabela de mapeamento (nicho em português → tag do OSM),
  coberta na seção "Fluxo de busca diária". Nichos fora dessa tabela caem
  num modo de busca por nome menos preciso.
- Combinado, é mais provável não bater 10 leads em algum dia do que seria
  com o Google Maps — já esperado, a trava de teto nunca força incluir lead
  fraco só pra completar o número.

## Estado atual da implementação

Já implementado, testado e commitado (ver
`docs/superpowers/plans/2026-09-09-lead-sourcing-automatico.md`):

- Tabela `sourcing_settings` (`id`, `active_niches` jsonb, `target_region`,
  `last_niche_index`, `updated_at`) e coluna `leads.external_place_id`
  (text, unique, nullable) — a chave de deduplicação pro elemento do OSM.
- `getSourcingConfig()`/`saveSourcingConfig()` em `src/services/storage.js`
  — leem/gravam nichos e região, e calculam o resumo do dia contando
  `leads` com `source = 'openstreetmap'` criados desde a meia-noite local.
- `GET`/`PUT /api/sourcing-config` em `src/routes/api.js`.
- Aba "Prospecção Automática" no dashboard (`public/index.html`,
  `public/js/app.js`, `public/js/api.js`, `public/css/style.css`) — lista de
  nichos com adicionar/remover, campo de região, painel de status, botão
  salvar.

**Ainda não implementado** (o que falta pra isso rodar de verdade): o band
de busca diária em si no workflow "Prospec" do n8n, descrito na seção
abaixo. Vai ser construído direto na API do n8n (mesmo padrão do Follow-up
de Atenção), não via plano/TDD, já que não tem suíte de teste local pra um
grafo de n8n.

## Configuração necessária (passo do usuário)

Nenhuma. Sem conta, sem chave de API, sem cartão, sem billing, sem depósito.
A Overpass API é um serviço público gratuito; o único cuidado técnico (não
do usuário) é respeitar a política de uso justo dela — no máximo uma
requisição por segundo e um identificador (`User-Agent`) descritivo em cada
chamada, o que o volume desse fluxo (poucas chamadas por dia) cumpre com
folga.

## Fluxo de busca diária (novo band no workflow "Prospec" - a construir)

Mesmo padrão dos outros bands: schedule trigger 1x/dia, nodes nativos de
n8n, sem Code node, erro de qualquer node cai automaticamente no
"Prospec - Tratamento de Erros" já existente (com a trava de no máximo 5
avisos por 2h já implementada).

1. **Trava de teto diário**: conta quantos leads `source='openstreetmap'`
   foram criados desde o início do dia (hora local). Se já bateu 10, o fluxo
   para aqui.
2. **Escolhe o nicho do dia**: lê `sourcing_settings`, calcula
   `(last_niche_index + 1) % tamanho da lista`, usa o nicho dessa posição, e
   já grava esse índice de volta em `last_niche_index` (alternância
   round-robin entre os nichos ativos - o `getSourcingConfig()` já
   implementado assume que `last_niche_index` reflete o nicho *mais
   recentemente* buscado, não o próximo).
3. **Resolve a região**: consulta o Nominatim (serviço de geocodificação do
   próprio OpenStreetMap, também gratuito e sem chave) pra transformar o
   texto da região (ex.: "Blumenau, SC, Brasil") na área que a Overpass API
   entende.
4. **Traduz o nicho pra tag do OSM**: uma tabela pequena mantida no próprio
   fluxo mapeia nichos comuns pra tags estruturadas — ex.: "dentista" →
   `amenity=dentist`, "fisioterapia" → `healthcare=physiotherapist`,
   "clínica" → `amenity=clinic`, "salão de beleza" → `shop=hairdresser`.
   Nichos digitados pelo usuário que não estejam nessa tabela caem num modo
   de busca pelo nome (procura o texto do nicho dentro do campo `name` dos
   lugares da região) — funciona, mas traz resultado menos preciso. A
   tabela pode crescer conforme o usuário for testando nichos novos.
5. **Busca na Overpass API** dentro da área resolvida, pela tag (ou nome)
   do nicho. Retorna os elementos com nome, tags de contato (`phone`,
   `contact:phone`, `website`) e o identificador único do elemento.
6. **Pra cada candidato**, na ordem, até fechar o teto do dia:
   - **Já existe?** identificador já em algum lead (`external_place_id`) →
     pula, não conta.
   - **Tem celular?** Telefone (de qualquer uma das tags de contato) tem
     formato de celular brasileiro (DDD + 9 dígitos, mesma regra de sempre)
     → senão (sem telefone, ou só fixo), pula, não conta.
   - **É candidato bom?** Qualifica se **qualquer um** for verdade: sem
     `website`, OU `website` é só um link de instagram.com/facebook.com.
     Senão, pula (não é prioridade agora).
   - Passou tudo → cadastra o lead: `company_name`, `niche`, `phone`
     normalizado, `website` (link social guardado do mesmo jeito),
     `external_place_id`, `source: 'openstreetmap'`,
     `status: 'READY_FOR_OUTREACH'`, `automation_enabled: true`, e `notes`
     com o contexto (ex.: "Fonte: OpenStreetMap. Rede social encontrada:
     instagram.com/..."). Registra o evento `LEAD_CREATED` (mesmo padrão do
     cadastro manual).
7. Se não fechar 10 no dia, tudo bem — não força incluir lead fraco pra
   bater o número. Amanhã roda de novo, com o próximo nicho da lista.

Como o telefone já tem uma constraint de unicidade (`leads_phone_unique`),
uma segunda camada de proteção contra duplicado "de graça": se por algum
motivo dois elementos diferentes tiverem o mesmo telefone, o insert falha
com conflito (409) e isso é tratado como "já existe, pula" — não como erro.

## Testes

Backend/dashboard já cobertos (ver o plano de implementação). Pra o band do
n8n, mesmo processo já estabelecido no projeto: desabilitar o schedule
trigger antes de testar; rodar uma vez manualmente com o nicho/região de
teste; conferir no Supabase que os leads criados têm os campos certos;
apagar qualquer lead de teste ao final, confirmado por query direta.
