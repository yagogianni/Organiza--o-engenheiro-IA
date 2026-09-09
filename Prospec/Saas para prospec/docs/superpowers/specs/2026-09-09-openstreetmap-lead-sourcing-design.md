# Sourcing Automático de Leads via OpenStreetMap — Spec

**Data:** 2026-09-09
**Status:** Aprovado pelo usuário, pronto para plano de implementação.

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

**Decisão de fonte de dados:** a opção natural seria a API do Google Places,
mas o usuário pediu explicitamente para não gastar nada nem cadastrar cartão
de crédito agora — o Google exige conta de cobrança vinculada mesmo pra
ficar dentro da cota grátis. A fonte escolhida foi o **OpenStreetMap**, via
sua **Overpass API**: 100% gratuita, sem chave, sem cadastro, sem cartão,
zero risco de cobrança, pra sempre. A troca tem um custo real de qualidade,
detalhado nas seções abaixo — o usuário confirmou que prefere isso a
qualquer risco (mesmo que travado por cota) de precisar lidar com cobrança.

## Objetivo

Um novo band no workflow "Prospec" do n8n que roda 1x por dia, busca
candidatos no OpenStreetMap dentro dos nichos/região configurados pelo
usuário, aplica os filtros de elegibilidade e qualidade, e cadastra os
aprovados em `leads` com os mesmos valores (`status: 'READY_FOR_OUTREACH'`,
`automation_enabled: true`) que um lead manual recebe — a partir daí ele
entra no pipeline de outreach que já existe, sem nenhuma mudança lá.

Uma tela nova no dashboard deixa o usuário configurar nichos e região, e ver
um resumo simples do que rodou hoje, sem precisar abrir o n8n.

## Fora de escopo

- Medir tráfego pago real ou engajamento de Instagram/Facebook (não tem API
  gratuita confiável pra isso).
- Expandir a busca pra múltiplas cidades/regiões ao mesmo tempo num único
  ciclo — a região é uma só por vez, editável pelo dashboard quando o usuário
  quiser mudar.
- Um "score" numérico de prioridade entre os leads sourced — a lista de
  filtros abaixo é um corte binário (qualifica ou não), não um ranking.
- Um relatório detalhado de "por que cada candidato foi descartado" —
  o painel de status mostra só nicho do dia + quantos entraram hoje (ver
  "Tela do dashboard"). Detalhamento de motivos de descarte é uma melhoria
  futura, não necessária pra v1.
- Nível de detalhe de avaliações/nota (rating) como critério de qualidade —
  o OpenStreetMap não tem sistema de avaliações. Esse critério, que tínhamos
  desenhado pensando no Google, foi removido (ver o passo "É candidato bom?"
  em "Fluxo de busca diária").

## Limitações conhecidas da troca pra OpenStreetMap (importante o usuário topar isso)

- **Cobertura menor**: o OSM depende de voluntários mapeando cada lugar.
  Cidades grandes costumam estar bem mapeadas; cidades pequenas/bairros
  específicos podem ter poucas empresas cadastradas num nicho, mesmo que
  existam várias na vida real.
- **Telefone nem sempre presente**: muitas entradas no OSM não têm o campo
  de telefone preenchido, mesmo quando a empresa existe e está bem
  localizada no mapa. Esses casos são tratados igual "sem celular" — pulados.
- **Sem sistema de avaliações**: o filtro de qualidade fica só em "tem site
  próprio ou não" (ver abaixo), não tem como medir popularidade/visibilidade
  como o Google oferece com número de avaliações.
- **Nichos não são texto livre por baixo dos panos**: o OSM organiza
  negócios por tags estruturadas (ex.: `amenity=dentist`,
  `healthcare=physiotherapist`), não por busca de texto livre. Isso é
  resolvido com uma tabela de mapeamento (nicho em português → tag do OSM),
  coberta na seção "Fluxo de busca diária". Nichos fora dessa tabela caem
  num modo de busca por nome menos preciso.

Combinado, isso quer dizer que **é mais provável não bater 10 leads em
algum dia** do que seria com o Google Maps. Isso já está previsto no
desenho (a trava de teto nunca força incluir lead fraco só pra completar o
número) — é só mais frequente aqui.

## Modelo de dados

Duas mudanças em Supabase:

- **Tabela nova `sourcing_settings`** (uma linha só, é configuração global do
  usuário, não por-lead):
  - `id` (fixo, ex.: `'default'`)
  - `active_niches` (jsonb, array de strings — ex.: `["clínica", "dentista", "fisioterapia"]`)
  - `target_region` (text — ex.: `"Blumenau, SC, Brasil"`, resolvida pra uma
    área do OpenStreetMap na hora da busca)
  - `last_niche_index` (int, default 0) — qual posição do array foi buscada
    por último, pra alternar entre os nichos ativos em vez de repetir sempre
    o primeiro
  - `updated_at`
- **Coluna nova em `leads`: `external_place_id`** (text, nullable, unique) —
  identificador único do elemento no OpenStreetMap (ex.: `"osm:node/123456"`
  ou `"osm:way/123456"`). É a chave de deduplicação: nunca cadastra o mesmo
  elemento duas vezes.

Leads sourced ficam com os campos existentes normalmente: `company_name`
(nome do lugar), `niche` (o nicho buscado), `phone` (telefone normalizado,
mesma regra de sempre), `website` (o valor da tag `website` do OSM, quando
existir — pode ser um site de verdade ou um link de Instagram/Facebook,
guardado do mesmo jeito), `source: 'openstreetmap'`,
`status: 'READY_FOR_OUTREACH'`, `automation_enabled: true`. Quando o
`website` for um link de rede social, isso é registrado em `notes` (coluna
que já existe) pra o usuário ter contexto de cara ao abrir o lead — ex.:
`"Fonte: OpenStreetMap. Rede social encontrada: instagram.com/..."`.

Como o telefone já tem uma constraint de unicidade (`leads_phone_unique`),
uma segunda camada de proteção contra duplicado "de graça": se por algum
motivo dois elementos diferentes tiverem o mesmo telefone, o insert falha
com conflito (409) e isso é tratado como "já existe, pula" — não como erro.

## Configuração necessária (passo do usuário)

Nenhuma. Sem conta, sem chave de API, sem cartão, sem billing. A Overpass
API é um serviço público gratuito; o único cuidado técnico (não do usuário)
é respeitar a política de uso justo dela — no máximo uma requisição por
segundo e um identificador (`User-Agent`) descritivo em cada chamada, o que
o volume desse fluxo (poucas chamadas por dia) cumpre com folga.

## Fluxo de busca diária (novo band no workflow "Prospec")

Mesmo padrão dos outros bands: schedule trigger 1x/dia, nodes nativos de
n8n, sem Code node, erro de qualquer node cai automaticamente no
"Prospec - Tratamento de Erros" já existente (com a trava de no máximo 5
avisos por 2h já implementada).

1. **Trava de teto diário**: conta quantos leads `source='openstreetmap'`
   foram criados desde o início do dia (hora local). Se já bateu 10, o fluxo
   para aqui.
2. **Escolhe o nicho do dia**: lê `sourcing_settings`, pega o nicho na
   posição `last_niche_index % tamanho da lista`, e já incrementa esse
   índice pro próximo dia (alternância round-robin entre os nichos ativos).
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
   - **Já existe?** identificador já em algum lead → pula, não conta.
   - **Tem celular?** Telefone (de qualquer uma das tags de contato) tem
     formato de celular brasileiro (DDD + 9 dígitos, mesma regra de sempre)
     → senão (sem telefone, ou só fixo), pula, não conta.
   - **É candidato bom?** Qualifica se **qualquer um** for verdade: sem
     `website`, OU `website` é só um link de instagram.com/facebook.com.
     Senão, pula (não é prioridade agora).
   - Passou tudo → cadastra o lead (campos acima) e registra o evento
     `LEAD_CREATED` (mesmo padrão do cadastro manual).
7. Se não fechar 10 no dia, tudo bem — não força incluir lead fraco pra
   bater o número. Amanhã roda de novo, com o próximo nicho da lista.

## Tela do dashboard

Uma seção nova ("Prospecção Automática") com:

- Lista de nichos ativos, cada um com uma caixinha de marcar/desmarcar, mais
  um campo de texto pra adicionar um nicho novo (livre, ex.: "salão de
  beleza") e um botão de remover nos existentes. Um aviso curto ao lado do
  campo de texto: nichos fora da lista já conhecida (dentista, fisioterapia,
  clínica, salão de beleza, veterinária, academia, pet shop — a tabela
  inicial) funcionam, mas trazem resultado menos preciso.
- Campo de texto pra região (ex.: "Blumenau, SC, Brasil").
- Painel de status simples: nicho buscado hoje, quantos leads entraram hoje
  (`N de 10`).
- Botão "Salvar".

Dois endpoints novos no backend (`src/routes/api.js`, seguindo o padrão
já existente de rotas finas que delegam pro `storage.js`):
`GET /api/sourcing-config` (lê `sourcing_settings` + o resumo de hoje) e
`PUT /api/sourcing-config` (atualiza nichos/região).

## Testes

Mesmo processo já estabelecido no projeto: antes de testar de ponta a ponta
contra o serviço real, desabilitar o schedule trigger do novo band; rodar
uma vez manualmente com o nicho/região de teste; conferir no Supabase que os
leads criados têm os campos certos (`source`, `external_place_id`, `notes`
com o motivo de qualificação); apagar qualquer lead de teste ao final,
confirmado por query direta. Suite `node --test` cobrindo os dois endpoints
novos (`GET`/`PUT /api/sourcing-config`) e a validação de payload (nichos
como array de strings não-vazias, região como string não-vazia).
