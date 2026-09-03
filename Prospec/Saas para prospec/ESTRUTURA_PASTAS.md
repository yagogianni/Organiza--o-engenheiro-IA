# 📁 Estrutura de Pastas - PROSPEC.AI

## Hierarquia Completa (Fase 1)

```
saas-prospect/
│
├── 📄 README.md                    ✅ Guia rápido & onboarding
├── 📄 Claude.md                    ✅ Especificação completa do projeto
├── 📄 PLANO_FASE_1.md             ✅ Plano técnico & arquitetura
├── 📄 ESTRUTURA_PASTAS.md         ✅ Este arquivo
│
├── ⚙️ package.json                 ✅ Dependências Node.js
├── 📝 .env.example                ✅ Exemplo de configuração
├── 🔒 .gitignore                  ✅ Arquivos ignorados pelo git
│
├── 📂 src/                         🚀 Backend (Node.js)
│   ├── 📄 index.js                ✅ Entry point (Express server)
│   │
│   ├── 📂 routes/
│   │   └── 📄 api.js              ✅ Definição das rotas API
│   │
│   ├── 📂 services/
│   │   ├── 📄 claude.js           ✅ Integração Claude API
│   │   ├── 📄 storage.js          ✅ Persistência (JSON files)
│   │   └── 📄 analysis.js         ✅ Lógica de análise
│   │
│   └── 📂 utils/
│       ├── 📄 id-generator.js     ✅ Geração de IDs únicos
│       └── 📄 validators.js       ✅ Validação de inputs
│
├── 📂 public/                      🎨 Frontend (HTML/CSS/JS)
│   ├── 📄 index.html              ✅ Página principal
│   │
│   ├── 📂 css/
│   │   ├── 📄 style.css           ✅ Estilos principais
│   │   └── 📄 theme.css           ✅ Temas (dark/light)
│   │
│   ├── 📂 js/
│   │   ├── 📄 app.js              ✅ Lógica principal
│   │   ├── 📄 api.js              ✅ Chamadas fetch
│   │   ├── 📄 ui.js               ✅ Manipulação DOM
│   │   └── 📄 storage-local.js    ✅ localStorage
│   │
│   └── 📂 assets/
│       └── 📄 favicon.ico         (para Fase 2)
│
├── 📂 data/                        💾 Dados Locais (criado em runtime)
│   ├── 📄 prospects.json5         (índice de prospects)
│   ├── 📄 config.json5            (configurações do usuário)
│   │
│   └── 📂 [prospect-id]/
│       ├── 📄 metadata.json5      (empresa + contato)
│       ├── 📄 history.json5       (conversa completa)
│       └── 📄 analyses.json5      (análises por data)
│
└── 📂 tests/                       🧪 (Fase 2+)
    └── 📄 api.test.js
```

---

## 📋 Descrição de Cada Arquivo

### Root Level

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `README.md` | Guia rápido para iniciar o projeto | ✅ Pronto |
| `Claude.md` | Especificação completa (funcionalidades, regras, restrições) | ✅ Pronto |
| `PLANO_FASE_1.md` | Plano técnico: tech stack, arquitetura, timeline | ✅ Pronto |
| `ESTRUTURA_PASTAS.md` | Este arquivo - descrição da hierarquia | ✅ Pronto |
| `package.json` | Dependências e scripts npm | ✅ Pronto |
| `.env.example` | Exemplo de configuração (copiar para `.env`) | ✅ Pronto |
| `.gitignore` | Arquivos ignorados pelo git | ✅ Pronto |

### `src/` - Backend

#### `src/index.js`
- Entry point da aplicação
- Cria servidor Express
- Carrega variáveis de ambiente
- Inicia servidor em `http://localhost:3000`
- **Status**: ✅ Estrutura básica pronta (implementação em Fase 1)

#### `src/routes/api.js`
- Define todas as rotas da API
- **Endpoints principais**:
  - `POST /api/analyze` - Analisa novo prospect
  - `POST /api/continue` - Continua conversa
  - `GET /api/prospects` - Lista todos
  - `GET /api/prospect/:id` - Detalhe + histórico
- **Status**: ✅ Stubs prontos (implementação em Fase 1)

#### `src/services/claude.js`
- Chamadas à Claude API
- Funções: `analyzeNewProspect()`, `continueConversation()`
- Prompt engineering
- **Status**: ✅ Stubs prontos (implementação em Fase 1)

#### `src/services/storage.js`
- Persistência em JSON files
- Funções: `getAllProspects()`, `getProspect()`, `saveProspect()`, `addToHistory()`
- Gerenciamento de pasta `/data`
- **Status**: ✅ Stubs prontos (implementação em Fase 1)

#### `src/services/analysis.js`
- Lógica de análise (Fase 2+)
- Funções: `determineStage()`, `determineInterestLevel()`, `detectObjections()`
- **Status**: ✅ Stubs prontos (Fase 2)

#### `src/utils/id-generator.js`
- Gera IDs únicos para prospects
- Formato: `prosp_[uuid]_[timestamp]`
- **Status**: ✅ Pronto para usar

#### `src/utils/validators.js`
- Valida inputs do formulário
- Funções: `validateNewProspect()`, `validateContinueInput()`, `sanitizeString()`
- **Status**: ✅ Pronto para usar

### `public/` - Frontend

#### `public/index.html`
- Única página da aplicação (SPA)
- 2 abas: "Nova Prospecção" + "Continuar Conversa"
- Layout responsivo (2 colunas → 1 coluna em mobile)
- **Status**: ✅ Estrutura completa pronta

#### `public/css/style.css`
- Estilos principais
- Layout 2 colunas (flexbox/grid)
- Componentes: forms, buttons, panels, analysis sections
- **Status**: ✅ Pronto (ajustes menores em Fase 2)

#### `public/css/theme.css`
- Temas dark/light mode
- Variáveis CSS (colors, spacing, typography)
- Suporte automático a `prefers-color-scheme`
- **Status**: ✅ Pronto

#### `public/js/app.js`
- Lógica principal da aplicação
- Event listeners, form handling
- Integração entre UI, API, storage
- **Status**: ✅ Skeleton pronto (implementação em Fase 1)

#### `public/js/api.js`
- Wrapper para chamadas fetch
- Funções: `analyzeNewProspect()`, `continueConversation()`, `getProspects()`, `getProspect()`
- **Mock data** para desenvolvimento sem backend
- **Status**: ✅ Com mock data (trocar por real em Fase 1)

#### `public/js/ui.js`
- Utilitários de DOM manipulation
- Funções: `show()`, `hide()`, `setText()`, etc
- **Status**: ✅ Skeleton pronto

#### `public/js/storage-local.js`
- Gerencia localStorage do navegador
- Salva: tema, aba ativa, draft de formulário, estado de filtros
- **Status**: ✅ Pronto

#### `public/assets/favicon.ico`
- Ícone do navegador (para Fase 2)

### `data/` - Armazenamento Local

Criado automaticamente em runtime. Estrutura:

```
data/
├── prospects.json5
│   {
│     "prospects": [
│       { "id": "prosp_xxx_123", "empresa": "...", "contato": "...", ... },
│       ...
│     ]
│   }
│
├── config.json5
│   {
│     "lastUpdated": "2024-08-20T14:30:00Z",
│     "version": "0.1.0"
│   }
│
└── prosp_xxx_123/
    ├── metadata.json5
    │   { "empresa": "...", "contato": "...", "cargo": "...", ... }
    │
    ├── history.json5
    │   {
    │     "messages": [
    │       { "date": "...", "type": "outgoing", "content": "..." },
    │       { "date": "...", "type": "incoming", "content": "..." },
    │       ...
    │     ]
    │   }
    │
    └── analyses.json5
        {
          "analyses": [
            {
              "date": "2024-08-20T14:30:00Z",
              "stage": "Frio",
              "interest": "Médio",
              "strategy": "...",
              "nextMessage": "..."
            },
            ...
          ]
        }
```

- **Status**: ✅ Estrutura definida (implementação em Fase 1)

### `tests/` - Testes (Fase 2+)

Placeholder para testes unitários e de integração.

---

## 🔄 Fluxo de Dados

### Nova Prospecção
```
Frontend Form (HTML)
    ↓
Validação (validators.js)
    ↓
Fetch POST /api/analyze (api.js)
    ↓
Backend /routes/api.js
    ↓
claude.js (Claude API call)
    ↓
storage.js (Save prospect + metadata)
    ↓
Response com análise + mensagem
    ↓
Frontend exibe (index.html + app.js + style.css)
```

### Continuar Conversa
```
Frontend seleciona prospect (app.js)
    ↓
Fetch GET /api/prospect/:id (api.js)
    ↓
storage.js (Load historia completa)
    ↓
Frontend exibe histórico
    ↓
Usuário insere resposta
    ↓
Fetch POST /api/continue (api.js)
    ↓
Backend chama Claude com contexto completo
    ↓
storage.js (Salva resposta + análise)
    ↓
Frontend exibe análise + próxima mensagem
```

---

## 📊 Tamanho de Arquivos (Fase 1)

| Parte | Tamanho |
|-------|---------|
| `src/` | ~20KB |
| `public/` | ~40KB |
| `node_modules/` | ~100MB (apenas na instalação) |
| Dados por prospect | ~2-5KB |
| Total com 50 prospects | ~300KB |

---

## 🚀 Como Navegar o Código

### Primeiro contato?
1. Leia `README.md` para quick start
2. Leia `Claude.md` para entender o projeto
3. Comece em `src/index.js` (entry point)

### Querendo adicionar funcionalidade?
1. Frontend: Modifique `public/index.html` + `public/js/app.js`
2. Backend: Adicione rota em `src/routes/api.js` + lógica em `src/services/`
3. Armazenamento: Modifique `src/services/storage.js`

### Qual arquivo muda com frequência em Fase 1?
- `src/routes/api.js` (implementação de endpoints)
- `src/services/claude.js` (ajustes de prompts)
- `public/js/app.js` (event handling)

---

## ✅ Checklist Estrutura

- ✅ `Claude.md` preenchido com especificação completa
- ✅ `PLANO_FASE_1.md` com tech stack + arquitetura
- ✅ `README.md` com quick start
- ✅ `package.json` com dependências mínimas
- ✅ `.env.example` com variáveis necessárias
- ✅ Estrutura de pastas `/src` + `/public` criada
- ✅ Arquivos stubs prontos (não implementados ainda)
- ✅ Frontend HTML + CSS + JS skeleton
- ✅ Backend Express skeleton
- ✅ Definição de rutas API

**Próximo passo**: Começar implementação Fase 1 conforme `PLANO_FASE_1.md`

---

**Última atualização**: 2026-08-20  
**Status**: 🚀 Estrutura Fase 1 Completa
