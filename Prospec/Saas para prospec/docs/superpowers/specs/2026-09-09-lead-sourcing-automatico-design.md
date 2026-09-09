# Sourcing Automático de Leads — Spec

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

## Decisão de fonte de dados

Foram avaliadas duas fontes antes de fechar:

- **OpenStreetMap (Overpass API)**: testado em tempo real contra "dentista
  em Blumenau, SC" — achou 91 dentistas cadastrados (cobertura boa), mas só
  9 tinham telefone no formato de celular (o resto é fixo comercial), e
  desses, 8 qualificariam pelos filtros de qualidade. Ou seja, funciona,
  mas fica perto do teto de 10/dia com só 1 nicho ativo, e não tem sistema
  de avaliações (perderia o critério "poucas avaliações" abaixo). É 100%
  grátis, sem chave, sem cartão.
- **Google Places API**: dado mais completo e consistente (telefone,
  site, número de avaliações), mas exige cadastrar uma conta de cobrança no
  Google Cloud pra ativar a API, mesmo pra ficar dentro do grátis.

O usuário decidiu ir de **Google Places API**, priorizando a qualidade do
dado — mas com uma exigência clara: **zero risco de gasto**. Isso é
resolvido travando uma **cota** no Google Cloud (não é só um alerta, é um
limite técnico que rejeita qualquer chamada acima do definido) — ver
"Configuração necessária" abaixo. Ainda precisa cadastrar um cartão pra
ativar a API (exigência do próprio Google, inevitável), mas a cota garante
que ele nunca será cobrado.

## Objetivo

Um novo band no workflow "Prospec" do n8n que roda 1x por dia, busca
candidatos no Google Places API dentro dos nichos/região configurados pelo
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

## Modelo de dados

Duas mudanças em Supabase:

- **Tabela nova `sourcing_settings`** (uma linha só, é configuração global do
  usuário, não por-lead):
  - `id` (fixo, ex.: `'default'`)
  - `active_niches` (jsonb, array de strings — ex.: `["clínica", "dentista", "fisioterapia"]`)
  - `target_region` (text — ex.: `"Blumenau, SC, Brasil"`, usado como sufixo
    da busca no Places API)
  - `last_niche_index` (int, default 0) — qual posição do array foi buscada
    por último, pra alternar entre os nichos ativos em vez de repetir sempre
    o primeiro
  - `updated_at`
- **Coluna nova em `leads`: `external_place_id`** (text, nullable, unique) —
  o `place_id` que o Google dá pra cada lugar no Maps. É a chave de
  deduplicação: nunca cadastra o mesmo `place_id` duas vezes, independente de
  pequenas diferenças em nome/endereço que o Maps às vezes retorna.

Leads sourced usam os campos existentes normalmente: `company_name` (nome do
lugar), `niche` (o nicho buscado), `phone` (telefone normalizado, mesma
regra de sempre), `website` (o campo `website` que o Places retorna — pode
ser um site de verdade ou um link de Instagram/Facebook, guardado do mesmo
jeito), `source: 'google_maps'`, `status: 'READY_FOR_OUTREACH'`,
`automation_enabled: true`. Quando o `website` for um link de rede social,
ou quando o motivo de qualificação for "poucas avaliações", isso é
registrado em `notes` (coluna que já existe) pra o usuário ter contexto de
cara ao abrir o lead — ex.: `"Fonte: Google Maps. Rede social:
instagram.com/... | Avaliações no Google: 8 (nota 4.2)."`.

Como o telefone já tem uma constraint de unicidade (`leads_phone_unique`),
uma segunda camada de proteção contra duplicado "de graça": se por algum
motivo dois `place_id` diferentes tiverem o mesmo telefone, o insert falha
com conflito (409) e isso é tratado como "já existe, pula" — não como erro.

## Configuração necessária (passo do usuário — importante seguir na ordem)

1. Criar um projeto no Google Cloud (ou usar um existente) e ativar a
   **Places API (New)**.
2. Gerar uma chave de API restrita a essa API (evita uso indevido se a chave
   vazar).
3. Vincular uma conta de cobrança ao projeto — o Google exige isso mesmo pra
   ficar dentro do grátis. Sem isso a API nem ativa.
4. **Travar uma cota** (não é opcional, é o que garante zero gasto): em
   "APIs e Serviços" → "APIs Ativadas" → clicar na Places API → aba "Cotas e
   Limites do Sistema" → editar a cota de requisições por dia pra um número
   baixo, ex.: **100/dia**. Isso é bem acima do que o fluxo realmente usa
   (~20/dia) mas bem abaixo do que geraria qualquer cobrança — e é uma
   trava técnica: passar disso simplesmente rejeita a chamada com erro, não
   cobra nada. Editar cota pra baixo é auto-serviço, não precisa de
   aprovação do Google.
5. Como segunda rede de segurança (redundante com a cota, mas não custa
   nada ter): configurar um alerta de orçamento baixo (ex.: R$1) que avisa
   por e-mail se, por algum motivo, algo for cobrado.
6. Guardar a chave como `GOOGLE_MAPS_API_KEY` no `.env` e no header/query do
   node correspondente no n8n (mesmo padrão de todas as outras chaves do
   projeto).

Custo esperado com a cota travada: **zero, garantido tecnicamente** — não é
uma promessa de "deve ficar dentro do grátis", é uma trava que impede
qualquer chamada acima do limite definido.

## Fluxo de busca diária (novo band no workflow "Prospec")

Mesmo padrão dos outros bands: schedule trigger 1x/dia, nodes nativos de
n8n, sem Code node, erro de qualquer node cai automaticamente no
"Prospec - Tratamento de Erros" já existente (com a trava de no máximo 5
avisos por 2h já implementada).

1. **Trava de teto diário**: conta quantos leads `source='google_maps'`
   foram criados desde o início do dia (hora local). Se já bateu 10, o fluxo
   para aqui — nem gasta chamada de API.
2. **Escolhe o nicho do dia**: lê `sourcing_settings`, pega o nicho na
   posição `last_niche_index % tamanho da lista`, e já incrementa esse
   índice pro próximo dia (alternância round-robin entre os nichos ativos).
3. **Busca no Google Places** (Text Search): `"<nicho> em <target_region>"`.
   Retorna até 20 candidatos por página, com `place_id`, nome, endereço e se
   tem site.
4. **Pra cada candidato**, na ordem, até fechar o teto do dia:
   - **Já existe?** `place_id` já em algum lead → pula, não conta.
   - **Busca detalhe do lugar** (Place Details): telefone completo,
     `website`, `rating`, `user_ratings_total`.
   - **Tem celular?** Telefone tem formato de celular brasileiro (DDD + 9
     dígitos, mesma regra de sempre) → senão, pula, não conta.
   - **É candidato bom?** Qualifica se **qualquer um** for verdade:
     sem `website`, OU `website` é só um link de instagram.com/
     facebook.com, OU `user_ratings_total` < 15. Senão, pula (não é
     prioridade agora).
   - Passou tudo → cadastra o lead (campos acima) e registra o evento
     `LEAD_CREATED` (mesmo padrão do cadastro manual).
5. **Se a primeira página não deu candidatos suficientes** pra fechar o teto
   do dia, busca a página seguinte do Places (até a 3ª — o Google limita a
   3 páginas por busca), respeitando o pequeno intervalo que o Google exige
   entre pedir uma página e a próxima.
6. Se mesmo assim não fechar 10 no dia, tudo bem — não força incluir lead
   fraco pra bater o número. Amanhã roda de novo, com o próximo nicho da
   lista.

### Limitação conhecida

Com o tempo, buscar sempre a mesma região pode esgotar candidatos novos de
um nicho (o Maps já foi todo "varrido" ali). Isso não é resolvido agora — o
usuário já tem controle pra adicionar nichos novos ou trocar a região pelo
dashboard quando perceber que um nicho está rendendo pouco, sem precisar de
mudança de código.

## Tela do dashboard

Uma seção nova ("Prospecção Automática") com:

- Lista de nichos ativos, cada um com uma caixinha de marcar/desmarcar, mais
  um campo de texto pra adicionar um nicho novo (livre, ex.: "salão de
  beleza") e um botão de remover nos existentes.
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
contra a API real do Google, desabilitar o schedule trigger do novo band;
rodar uma vez manualmente com o nicho/região de teste; conferir no Supabase
que os leads criados têm os campos certos (`source`, `external_place_id`,
`notes` com o motivo de qualificação); apagar qualquer lead de teste ao
final, confirmado por query direta. Suite `node --test` cobrindo os dois
endpoints novos (`GET`/`PUT /api/sourcing-config`) e a validação de payload
(nichos como array de strings não-vazias, região como string não-vazia).
