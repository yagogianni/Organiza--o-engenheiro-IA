# Registro Fotográfico — Pivô do Sistema de Laudos Karrer

**Data:** 2026-09-25
**Status:** Aprovado para planejamento de implementação

## Contexto

O engenheiro Bernardo Karrer (cliente do sistema, apelidado "Becuba" no WhatsApp)
deu feedback sobre o sistema completo de laudos construído em 2026-09-14 (ver
[`2026-09-14-sistema-laudos-karrer-design.md`](./2026-09-14-sistema-laudos-karrer-design.md)):
o assistente de 6 passos e a geração automática do laudo inteiro (cliente, imóvel,
conclusão, glossário, instrumentos, referências, assinaturas) é rígida demais para
como ele realmente trabalha. Ele usa o mesmo "molde" para vários documentos
diferentes (laudo de vistoria cautelar, laudo técnico, relatórios diversos) e cada
um varia em título, número de ART, se precisa ou não de campo de contratante, etc.
Automatizar essa parte "engessa" o processo.

O único pedaço que ele quer automatizado é o **registro fotográfico**: upload de
fotos, legenda por foto, exportado como PDF mantendo a identidade visual azul/branco
da Karrer. Ele monta o resto do documento no Canva (por flexibilidade total de
edição) e depois une o PDF de fotos gerado por este sistema com o PDF do Canva
usando o iLovePDF.

Durante o brainstorming, o usuário forneceu o PDF real que Bernardo produz hoje
(`Sandro Rozini_2026_Laudo Vistoria Cautelar_Cubas Fontoura_ass.pdf`, 63 páginas) —
different do PDF de referência usado na sessão de 2026-09-14. Esse PDF real é a
fonte de verdade para o sistema visual desta peça (ver seção **Sistema visual do
PDF** abaixo); ele diverge do que o app atual gera hoje (que tem faixas azuis no
topo de cada página e rodapé de linha fina, em vez do rodapé em faixa sólida que o
PDF real usa em toda página).

## Decisão de escopo

Substituir completamente o fluxo atual, não adicionar como modo alternativo.
Removido: os 3 tipos de laudo, o assistente de 6 passos, e as seções de PDF de
cliente, imóvel, conclusão, notas, instrumentos, glossário, referências,
assinaturas, capa e sumário. Login, `AuthGuard`, dashboard e histórico em
`localStorage` são mantidos.

## Modelo de dados

Substitui `LaudoData`, `ClientData`, `PropertyData` e `LaudoType` por completo:

```ts
export type PhotoSize = "quarter" | "half" | "full"; // quarter = padrão

export interface PhotoItem {
  id: string;
  dataUrl: string; // já comprimido via imageCompression.ts, sem mudança aí
  caption: string;
  order: number; // 1-based, ordem de exibição/impressão
  size: PhotoSize;
}

export interface PhotoReport {
  id: string;
  label?: string; // apelido livre só para localizar na lista; nunca impresso no PDF
  photos: PhotoItem[];
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}
```

**Mudança incompatível:** a chave `karrer_laudos` do `localStorage` passa a guardar
`PhotoReport[]` em vez de `LaudoData[]`. Não há migração — rascunhos antigos no
formato anterior deixam de ser lidos corretamente. Decisão aceita porque é uma
ferramenta de uso único-local (sem sincronização) e o pedido do cliente é
substituir o fluxo, não preservá-lo. **Assumção pendente de confirmação do
usuário:** não existe rascunho real em andamento que precise ser salvo/baixado
antes do deploy desta mudança.

`imageCompression.ts`, `masks.ts` (deixa de ser usado — máscara de CPF/CNPJ não
existe mais nesta versão) e `auth.ts` não mudam de comportamento.

## Fluxo e telas

- **Login** (`LoginPage`, `AuthGuard`): inalterado.
- **Dashboard**: cards de estatística mudam de "Total / Concluídos / Rascunhos /
  Último gerado" (mantém a mesma ideia, só sem contexto de cliente) para os mesmos
  quatro, e a lista de registros mostra `label` (se houver) ou "Registro
  fotográfico — N fotos", data de criação, status. Busca em tempo real filtra por
  `label`.
- **"Novo Registro Fotográfico"** (substitui `NewLaudo` + todos os `steps/*`):
  tela única, sem stepper:
  - Dropzone restilizada existente (`file-dropzone.tsx`), upload múltiplo.
  - Lista de fotos, cada item com: miniatura, campo de legenda (`Input`),
    seletor de tamanho (`ToggleGroup` de 3 opções: 1/4 · 1/2 · Página inteira —
    novo componente, não existe no catálogo atual), botões mover
    para cima/para baixo, botão remover. Sem drag-and-drop.
  - Botão "Salvar rascunho" (reaproveita `storage.ts`) e "Gerar PDF"
    (desabilitado com 0 fotos).
- **Detalhe do registro** (substitui `LaudoDetail`): mostra a lista de fotos
  (miniatura + legenda, somente leitura) e permite baixar o PDF novamente ou
  reabrir para editar se for rascunho.

## Sistema visual do PDF

Baseado diretamente no PDF real (`Sandro Rozini_...pdf`), não no PDF de referência
usado em 2026-09-14. Página A4 (`PAGE_WIDTH=210`, `PAGE_HEIGHT=297`, mm).

- **Sem capa, sem sumário.** O documento começa direto nas fotos.
- **Sem faixas coloridas no topo.** Primeira página: título simples
  "Registro Fotográfico" (cinza-escuro `#334155`, negrito, ~16pt), margem
  esquerda 15mm, topo ~20mm. Páginas seguintes de fotos não repetem o título —
  o conteúdo começa direto no topo (igual ao PDF real, página 18 vs. 17).
- **Rodapé sólido em toda página** (substitui a linha fina atual em
  `footer.ts`): retângulo preenchido `KARRER_BLUE` (`#1B3A6B`), altura 20mm,
  largura total da página, ancorado no fundo. Conteúdo em branco: "KARRER
  SERVIÇOS DE ENGENHARIA LTDA" em negrito, e abaixo "Bernardo Sieverdt Karrer —
  CREA/SC: 199052-0 — eng.bernardokarrer@hotmail.com — (47) 99977-0433" em
  peso normal, ambos alinhados à margem esquerda de 15mm.
- **Grade de fotos** — modelo mental: cada página tem 2 colunas; cada coluna
  comporta ou 1 foto `half` (ocupa a coluna inteira, do topo da área de
  conteúdo até o rodapé) ou até 2 fotos `quarter` empilhadas (cada uma metade
  da altura da coluna). Uma foto `full` ocupa as duas colunas inteiras
  sozinha, forçando quebra de página antes e depois dela.
  - Área de conteúdo: margem 15mm nas laterais, do topo (20mm, ou logo após o
    título na primeira página) até ~272mm (deixando ~5mm de respiro antes do
    rodapé de 20mm). Largura útil ~180mm, dividida em 2 colunas de ~88mm com
    ~4mm de calha entre elas.
  - Cada célula (`quarter`, `half` ou `full`) é composta por duas caixas com
    borda fina cinza-escura (`#334155`, ~0.3pt), lado a lado verticalmente e
    compartilhando a borda: a caixa da foto (maior) e, logo abaixo, a caixa da
    legenda (menor, altura suficiente para 1–2 linhas de texto). A imagem é
    ajustada por contain (preserva proporção, sem distorcer, letterbox se
    sobrar espaço) — nunca esticada como o `photos.ts` atual faz.
  - Legenda: formato `"N - texto"` (número sequencial simples, hífen — sem
    prefixo de seção, diferente do "3.X" do PDF de referência antigo, já que
    esta peça não vive dentro de um laudo maior com seções numeradas). Texto
    cinza-escuro `#334155`, centralizado, quebra de linha automática dentro da
    largura da caixa. Legenda vazia cai para "Sem legenda" (comportamento já
    existente, mantido).
  - Valores de mm acima são ponto de partida; ajuste fino durante a
    implementação por inspeção visual comparando com as páginas 17-19 do PDF
    real.

## Arquivos afetados

**Removidos:**
- `src/pages/steps/{StepType,StepClient,StepProperty,StepConclusion,StepReview}.tsx`
- `src/lib/pdf/sections/{client,property,conclusion,notes,instruments,glossary,references,signatures,summary,cover,header}.ts`
- `src/lib/pdf/content/{glossary,instruments,references}.ts` e
  `src/lib/pdf/content/__tests__/fixed-content.test.ts`
- `src/lib/masks.ts` (máscara de CPF/CNPJ não é mais usada)
- Testes correspondentes a cada arquivo removido em `__tests__/`

**Reescritos:**
- `src/types/laudo.ts` → novo modelo (`PhotoReport`, `PhotoItem`, `PhotoSize`)
- `src/lib/storage.ts` → mesma API (`getLaudos`/`saveLaudo`/`deleteLaudo`/`getLaudo`),
  tipo trocado para `PhotoReport`
- `src/lib/pdf/sections/photos.ts` → grade quarter/half/full descrita acima
- `src/lib/pdf/sections/footer.ts` → faixa sólida em vez de linha fina
- `src/lib/pdf/generateLaudo.ts` → orquestra só título (1ª página) + fotos + rodapé
  em toda página, sem capa/sumário
- `src/pages/NewLaudo.tsx` → tela única (sem stepper), lista de upload+legenda+tamanho
- `src/pages/Dashboard.tsx`, `src/pages/LaudoList.tsx`,
  `src/components/laudo/LaudoListItem.tsx`, `src/pages/LaudoDetail.tsx` → ajustados
  ao novo modelo (sem nome de cliente, com `label` opcional)
- `src/hooks/useLaudoForm.ts` → simplificado para o novo modelo de estado
- `README.md` → descreve a nova finalidade da ferramenta

**Novos:**
- Um componente de seleção de tamanho por foto (`ToggleGroup` de 3 opções — via
  shadcn/ui, reaproveitando o `radix-ui` já instalado)

**Reescrito (pequeno):**
- `src/lib/pdf/pageHelpers.ts` → `drawChrome`/`newPage` deixam de chamar
  `drawHeader` (removido) e de receber `sectionTitle` a cada página — o título
  passa a ser responsabilidade só da primeira página, desenhado uma vez por
  `generateLaudo.ts` antes do loop de fotos, não a cada `newPage()`.
  `drawFieldList`/`drawBulletList`/`drawTermList` são removidos junto (só
  serviam às seções eliminadas).

**Sem mudança:** `src/lib/auth.ts`, `src/lib/imageCompression.ts`,
`src/components/auth/*`, `src/components/layout/*`, `src/lib/pdf/constants.ts`.

## Erros e casos de borda

- **`StorageQuotaError`**: comportamento inalterado — `storage.ts` já trata
  `QuotaExceededError` e a UI já mostra a mensagem; nenhuma mudança necessária
  além de trocar o tipo genérico.
- **0 fotos**: botão "Gerar PDF" desabilitado; "Salvar rascunho" permitido (um
  rascunho vazio é um estado válido enquanto ele está montando).
- **Foto sem legenda**: usa "Sem legenda" no PDF (comportamento já existente).
- **Falha ao gerar/baixar PDF**: reaproveita o padrão já existente de
  try/catch com estado de erro visível e botão de retry (introduzido no
  commit `fe10d3b` da sessão anterior) — não precisa ser reinventado.

## Testes

- Deletar os arquivos de teste dos módulos removidos.
- Reescrever `src/lib/pdf/sections/__tests__/photos-notes.test.ts` (fica só
  "fotos"): cobrir o empacotamento quarter/half/full (2 quarters cabem numa
  coluna, 1 half ocupa a coluna inteira, 1 full força quebra de página antes e
  depois), o fallback "Sem legenda", e que a legenda usa `"N - texto"` sem
  prefixo de seção.
- Reescrever `cover-header-footer.test.ts` → só `footer.test.ts`: confirma que
  a faixa é desenhada em toda página (não só na primeira) e contém os dados de
  contato corretos.
- Atualizar `generateLaudo.test.ts`: sem capa/sumário, título só na primeira
  página, rodapé em todas.
- `storage.ts` e `useLaudoForm.ts`: testes existentes adaptados ao novo tipo,
  mesma cobertura de comportamento (quota, salvar, deletar).

## Fora de escopo

- Migração de dados do formato `LaudoData` antigo para `PhotoReport`.
- Reordenar fotos por arrastar (usa mover para cima/para baixo).
- Campos opcionais de cliente/ART/contratante em qualquer forma (nem fixos,
  nem toggle) — ele decidiu que isso não pertence a esta ferramenta.
- Múltiplos usuários/engenheiros.
- Sincronização entre dispositivos.

## Decisões já validadas com o usuário (2026-09-25)

1. Substituir o fluxo completo, não manter como segundo modo.
2. A "faixa azul lá embaixo" do pedido do cliente é o rodapé em faixa sólida do
   PDF real, confirmado visualmente — não as faixas de cabeçalho do app atual.
3. Controle de tamanho por foto, granularidade de 3 níveis (1/4 padrão, 1/2,
   página inteira), com fluxo automático de quebra de página.
4. Fotos `half` ficam lado a lado quando duas dividem a mesma página (modelo de
   coluna inteira).
5. Tela única substitui o stepper de 6 passos (sem barra de progresso).
6. Login, dashboard e histórico em `localStorage` são mantidos.
7. Legenda é editável por foto, independente do tamanho escolhido.
