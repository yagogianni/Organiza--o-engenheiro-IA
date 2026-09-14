# Sistema de Geração de Laudos Técnicos — Karrer Engenharia

**Data:** 2026-09-14
**Status:** Aprovado para planejamento de implementação

## Contexto

Aplicação web 100% client-side para o engenheiro Bernardo Sieverdt Karrer
(CREA/SC: 199052-0, Karrer Serviços de Engenharia Ltda) gerar laudos técnicos
de engenharia (vistoria cautelar, laudo técnico, orçamento) com formulário
guiado, upload de fotos, geração de PDF no navegador e histórico em
`localStorage`. Sem backend, sem banco de dados.

Referência visual: `Sandro Rozini_2026_Laudo Vistoria Cautelar_Cubas Fontoura_ass (2).pdf`
(63 páginas), um laudo real anteriormente produzido pelo próprio Bernardo
Karrer (mesmo CREA, e-mail e telefone em todas as páginas). Foi usado para
extrair estrutura de seções, formato de legendas de fotos, e o texto real de
"Instrumentos Utilizados" e "Glossário de Patologias" (ver seção
**Conteúdo fixo do PDF** abaixo).

## Stack

- React + Vite + TypeScript
- Tailwind CSS, cores customizadas: `karrer-blue: #1B3A6B`, `karrer-lightblue: #2E5FA3`, `karrer-navy: #0D2040`
- shadcn/ui: Button, Input, Badge, Dialog, Tooltip, Textarea, Select
- jsPDF — geração de PDF 100% client-side
- React Router v6
- `localStorage` para rascunhos e histórico
- `vercel.json` com rewrite SPA para deploy no Vercel

## Componentes visuais (21st.dev / Magic UI)

Os nomes do briefing original (`MagicCard`, `AnimatedCard`, `MagicDropzone`)
não existem literalmente no catálogo. Mapeamento confirmado via MCP do
21st.dev (URLs reais, verificadas nesta sessão):

| Uso no app | Componente | Fonte / install |
|---|---|---|
| Shimmer no botão "Gerar PDF" | ShimmerButton (Magic UI oficial) | `npx shadcn@latest add "https://21st.dev/r/dillionverma/shimmer-button"` |
| Beam ao hover nos cards do passo 1 | BorderBeam (Magic UI oficial) | `npx shadcn@latest add "https://21st.dev/r/dillionverma/border-beam"` |
| "Crie seu primeiro laudo" (estado vazio) | SparklesText (Magic UI oficial) | `npx shadcn@latest add "https://21st.dev/r/dillionverma/sparkles-text"` |
| Texto com gradiente (destaques pontuais) | GradientText | `npx shadcn@latest add "https://21st.dev/r/designali-in/gradient-text"` |
| Card de tipo de laudo (passo 1) — base do "MagicCard" | Spotlight Card | `npx shadcn@latest add "https://21st.dev/r/preetsuthar17/spotlight-card"` (+ BorderBeam sobreposto no hover) |
| Cards de estatística do Dashboard — "AnimatedCard" | Animated Card | `npx shadcn@latest add "https://21st.dev/r/badtzx0/animated-card"` |
| Upload de fotos (passo 4) — "MagicDropzone" | File Dropzone | `npx shadcn@latest add "https://21st.dev/r/joyco/file-dropzone"` (restilizado: borda tracejada + shimmer ao hover, conforme briefing) |

Sem Framer Motion em nenhum lugar (bundle leve) — inclusive nos 3 componentes
acima que exigirem ajuste, a animação deve ser CSS/JS simples (mouse-tracking
com `mousemove` + CSS custom properties, não uma lib de animação).

## Segurança e Autenticação

- Credenciais em `.env`: `VITE_APP_USERNAME`, `VITE_APP_PASSWORD_HASH`
- Hash: `btoa(encodeURIComponent(senha))` — nunca senha em texto puro
- `.env.example` documentado com instruções de como gerar o hash (é um
  placeholder — a senha real de Bernardo NUNCA vai para o repositório)
- Sessão em `localStorage`: `{ username, exp: Date.now() + 8h, token: randomUUID() }`
- `isAuthenticated()`: token existe E `Date.now() < exp`
- `AuthGuard` HOC em todas as rotas exceto `/login` — redireciona se não autenticado
- Ao expirar: limpa `localStorage`, redireciona para `/login`
- Tela de login: gradiente `#0D2040 → #1B3A6B`, logo centralizado, toggle de
  visibilidade de senha, animação de shake no campo ao errar
- Logout com `Dialog` de confirmação shadcn no sidebar

## Layout e Navegação

- Sidebar fixa 240px desktop: logo Karrer no topo, itens com ícone lucide-react
- Itens: Dashboard, Novo Laudo, Meus Laudos | separador | Logout
- Item ativo: fundo azul claro, borda lateral 3px azul escura
- Mobile: drawer com overlay, botão hamburger no header mobile
- Transições CSS puras (sem Framer Motion)

## Multi-step form — 6 etapas

Todos os 3 tipos de laudo (Vistoria Cautelar, Laudo Técnico, Orçamento) usam
**o mesmo formulário de 6 passos e a mesma estrutura de PDF** — só muda o
rótulo do tipo na capa e no sumário. (Decisão confirmada: sem campos/seções
específicos de orçamento nesta versão.)

Barra de progresso no topo: círculos numerados conectados por linha — ativo
azul, concluído check verde, futuro cinza.

**Passo 1 — Tipo:** 3 Spotlight Cards (com BorderBeam ao hover). Títulos:
"Laudo de Vistoria Cautelar", "Laudo Técnico", "Orçamento". Ícone lucide +
título + descrição de 1 linha. Avança ao clicar.

**Passo 2 — Cliente:** Nome completo/Razão social (required), CPF/CNPJ com
máscara, Endereço, Email (opcional).

**Passo 3 — Imóvel:** Endereço, Bairro, Cidade, Estado (Select com todas as
UFs), Data da vistoria (date), Número ART (required), Descrição do imóvel
(Textarea).

**Passo 4 — Fotos:** File Dropzone restilizada (borda tracejada + shimmer ao
hover). Upload múltiplo. Lista: miniatura 80×80, Badge azul com número auto
(1, 2...), legenda inline, botão X. Botão "Remover todas".

**Passo 5 — Conclusão + Notas:** Textarea "Conclusão" (required). Textarea
"Notas Técnicas" (opcional) com Tooltip: "Observações internas, medições,
referências de norma — aparecem no PDF antes da conclusão". Salvas em
`LaudoData.notes`. Aviso de que Instrumentos/Glossário/Referências são
automáticos.

**Passo 6 — Revisão:** Cards com resumo por seção. ShimmerButton azul "Gerar
PDF". Botão outline "Salvar rascunho".

## PDF (jsPDF) — estrutura visual

**CAPA:**
- Barra lateral esquerda 55mm em `#1B3A6B`, nome da empresa em branco na vertical
- Área branca: tipo do laudo em azul, caixas com dados do cliente/imóvel/ART/data
- Rodapé: faixa `#1B3A6B` com empresa, CREA, site

**PÁGINAS INTERNAS (cabeçalho + rodapé fixos):**
- Topo: faixa `#1B3A6B` com nome da empresa + número de página
- Faixa `#2E5FA3` abaixo com título da seção em branco
- Rodapé: linha fina azul + dados do engenheiro

**ORDEM DAS SEÇÕES:**
1. Sumário automático
2. Identificação do Solicitante
3. Identificação do Imóvel
4. Registro Fotográfico — grade 2 fotos/linha (2 colunas × N linhas,
   confirmado no PDF de referência); legenda `"3.X — texto"` sob cada foto
5. Notas Técnicas do Engenheiro (se preenchidas) — fundo `#F8FAFC`, borda
   lateral esquerda azul (`#1B3A6B`) 4px
6. Instrumentos Utilizados (texto fixo — ver abaixo)
7. Glossário de Patologias (texto fixo — ver abaixo)
8. Conclusão
9. Referências (texto fixo — ver abaixo)
10. Assinaturas (contratante + engenheiro com CREA)

### Conteúdo fixo do PDF

**Instrumentos Utilizados** (extraído verbatim do laudo de referência,
autoria do próprio Bernardo Karrer):
- Trena métrica fibra aberta 13mm x 30m
- Nível eletrônico digital
- Percussor manual de inspeção
- Trena eletrônica digital — Bosch GLM 50
- Trena métrica — Irwin 19mm x 5m
- Fissurômetro

**Glossário de Patologias** (extraído verbatim do laudo de referência, 63
termos, ordem alfabética A→V) e **Referências** (lista genérica do briefing
original): texto completo em
[`2026-09-14-sistema-laudos-karrer-conteudo-fixo.md`](./2026-09-14-sistema-laudos-karrer-conteudo-fixo.md),
pronto para ser transcrito em `src/lib/pdf/sections/glossary.ts` (array de
`{ termo, definicao }`) e `src/lib/pdf/sections/references.ts`.

**Editáveis na página de detalhe do laudo:** botão "Editar notas" (apenas o
campo Notas Técnicas — instrumentos/glossário/referências permanecem fixos
nesta versão).

## Dashboard

- Animated Card para estatísticas: Total, Concluídos, Rascunhos, Último gerado
- Lista de laudos com Badge de status: Concluído (verde), Rascunho (amarelo)
- Busca em tempo real por cliente, endereço ou tipo
- Estado vazio: SparklesText "Crie seu primeiro laudo"
- Ações por laudo: ver, baixar PDF, excluir (Dialog de confirmação shadcn)

## Design System

```js
// tailwind.config.js — theme.extend.colors
karrer: { blue: '#1B3A6B', lightblue: '#2E5FA3', navy: '#0D2040' }
```

Fundo app: `#F6F8FC` | Cards: branco, border `#E2E8F0`, radius 12px, sombra
leve | Fonte: Inter (Google Fonts) | Ícones: lucide-react

## Modelo de dados

```ts
type LaudoType = 'vistoria_cautelar' | 'laudo_tecnico' | 'orcamento';

interface ClientData {
  name: string;          // required
  document: string;       // CPF/CNPJ com máscara
  address: string;
  email?: string;
}

interface PropertyData {
  address: string;
  neighborhood: string;
  city: string;
  state: string;          // UF
  inspectionDate: string; // date
  artNumber: string;       // required
  description: string;
}

interface PhotoItem {
  id: string;
  dataUrl: string;         // base64, armazenado em localStorage
  caption: string;
  order: number;           // numeração automática 1, 2, 3...
}

interface LaudoData {
  id: string;
  type: LaudoType;
  client: ClientData;
  property: PropertyData;
  photos: PhotoItem[];
  conclusion: string;      // required
  notes?: string;          // opcional — "Notas Técnicas"
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
}
```

## Estrutura de arquivos

```
src/
  components/
    auth/        — LoginPage.tsx, AuthGuard.tsx
    layout/      — AppLayout.tsx, Sidebar.tsx, MobileHeader.tsx
    ui/          — componentes shadcn + 21st.dev instalados
  pages/
    Dashboard.tsx, NewLaudo.tsx, LaudoList.tsx, LaudoDetail.tsx
    steps/       — StepType, StepClient, StepProperty, StepPhotos, StepConclusion, StepReview
  lib/
    auth.ts      — login, logout, isAuthenticated, hashPassword
    storage.ts   — getLaudos, saveLaudo, deleteLaudo, getLaudo
    pdf/
      generateLaudo.ts
      sections/  — cover.ts, header.ts, footer.ts, photos.ts, notes.ts,
                    instruments.ts, glossary.ts, references.ts, signatures.ts
  types/
    laudo.ts     — LaudoData, PhotoItem, LaudoType, ClientData, PropertyData
```

## Deploy e operação

- 100% client-side, sem backend, sem banco de dados
- Laudos ficam no `localStorage` do navegador do engenheiro (risco aceito:
  sem sincronização entre dispositivos/navegadores — fora de escopo)
- `.env.example` com `VITE_APP_USERNAME`/`VITE_APP_PASSWORD_HASH` documentados
- `README.md`: como rodar localmente, como fazer deploy no Vercel, como
  trocar senha (gerar novo hash)
- `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`

## Riscos conhecidos e mitigação

- `localStorage` tem cota de ~5-10MB por origem (varia por navegador). O
  laudo de referência tem 180+ fotos numeradas — fotos de celular sem
  tratamento (3-8MB cada) estourariam a cota em um único laudo.
- **Mitigação (decisão de design):** toda foto é redimensionada e comprimida
  no client antes de virar `dataUrl` — canvas, largura máxima ~1600px,
  JPEG qualidade ~0.75. Isso é o que torna "fotos no localStorage" viável na
  prática; não é feature opcional.
- Mesmo assim, uso muito intenso pode estourar a cota. `storage.ts` deve
  tratar `QuotaExceededError` no `setItem` e avisar o engenheiro na UI
  (ex: "Espaço cheio — baixe o PDF e exclua rascunhos antigos"), em vez de
  falhar silenciosamente e perder o laudo em edição.

## Fora de escopo (nesta versão)

- Campos/seções específicos de orçamento (tabela de itens/preços)
- Sincronização multi-dispositivo / backend / banco de dados
- Edição de instrumentos/glossário/referências pela UI (só via código)
- Múltiplos usuários / múltiplos engenheiros

## Decisões já validadas com o usuário

1. Os 3 tipos de laudo compartilham formulário e estrutura de PDF idênticos.
2. Componentes sem correspondência exata no 21st.dev usam substitutos reais
   do catálogo (tabela acima), não implementações "from scratch" fictícias.
