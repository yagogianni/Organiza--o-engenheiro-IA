# PLANO FASE 1 - MVP Funcional

**Duração estimada**: 10-14 dias  
**Objetivo**: Sistema funcional que coleta prospectos, gera mensagens e salva conversas localmente

---

## A. TECH STACK LOCAL/GRATUITO

### Frontend
**Escolha: HTML5 + CSS3 + JavaScript Vanilla (sem frameworks)**

**Justificativa**:
- ✅ Zero dependências, roda offline
- ✅ Rápido de desenvolver
- ✅ Fácil de manter e debugar
- ✅ Pequeno bundle size
- ✅ Não precisa de build step
- ✅ Funciona em qualquer navegador moderno

**Alternativas consideradas**:
- React: Overkill para Fase 1, tempo de setup desnecessário
- Vue: Melhor que React mas ainda complexo para MVP
- Svelte: Interessante mas menos familiar

---

### Backend/Processamento de IA
**Escolha: Node.js + Claude API (gratuito até limite)**

**Justificativa**:
- ✅ Claude API tem tier gratuito (suficiente para testes)
- ✅ Processamento de análise rápido (< 2s por análise)
- ✅ Simples integrar com frontend (mesmo ambiente)
- ✅ Pode rodar localmente com npx (sem instalação complexa)

**Alternativas consideradas**:
- Python: Mais pesado para setup, menos integrado com JS frontend
- Ollama (LLM local): Requer download de ~7GB, lento em máquinas fracas
- Apenas Claude API via fetch: Expõe chave no frontend (inseguro)

**Solução Híbrida**:
- Frontend: HTML/CSS/JS puro
- Backend leve: Node.js com Express (minimal)
- IA: Claude API chamada via backend
- Persistência: JSON files (sem servidor)

---

### Armazenamento
**Escolha: JSON Files + JSON5 (local)**

**Justificativa**:
- ✅ Nenhuma dependência
- ✅ Fácil de ler e debugar
- ✅ Portável (copiar pasta)
- ✅ Backup trivial
- ✅ Suficiente para 100+ conversas

**Estrutura**:
```
/data/
  ├── prospects.json5      # Lista de todos os prospects
  └── [id]/
      ├── metadata.json5    # Dados da empresa e contato
      ├── history.json5     # Histórico de mensagens
      └── analyses.json5    # Análises por data
```

**Alternativa considerada**:
- SQLite: Mais robusto após Fase 1, mas JSON é suficiente agora

---

### IA/LLM
**Escolha: Claude 3.5 Sonnet (via API gratuita)**

**Justificativa**:
- ✅ Modelo mais capaz (compreensão contextual excelente)
- ✅ Tier gratuito: até 50 mil tokens/mês
- ✅ Suficiente para MVP (análise + geração de mensagens)
- ✅ Sem crédito de cartão obrigatório
- ✅ Respostas estruturadas com prompt engineering

**Alternativas consideradas**:
- Ollama local: Mais privado mas lento e pesado
- Groq (gratuito): Rápido mas modelo menor
- Hugging Face: Requer setup mais complexo

---

## B. ARQUITETURA GERAL

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (HTML/CSS/JS)            │
│  ┌──────────────────────────────────────────────┐   │
│  │  ✨ Interface do Usuário                      │   │
│  │  • Nova Prospecção (form)                     │   │
│  │  • Continuar Conversa (histórico + análise)   │   │
│  │  • Exibição de orientações                    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────┬──────────────────────────────────┘
                  │ Fetch API (JSON)
                  ▼
┌─────────────────────────────────────────────────────┐
│         BACKEND (Node.js + Express - minimal)       │
│  ┌──────────────────────────────────────────────┐   │
│  │  🔧 API Endpoints                             │   │
│  │  POST /api/analyze      (Nova prospecção)    │   │
│  │  POST /api/continue     (Continuar conversa) │   │
│  │  GET  /api/prospects    (Listar conversas)   │   │
│  │  GET  /api/prospect/:id (Detalhe)            │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  🤖 Lógica de IA                              │   │
│  │  • Chamadas Claude API                        │   │
│  │  • Prompt engineering                         │   │
│  │  • Parsing de respostas                       │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  💾 Persistência                              │   │
│  │  • Leitura/escrita JSON                       │   │
│  │  • Geração de IDs únicos                      │   │
│  │  • Backup automático                          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────┬──────────────────────────────────┘
                  │ Node.js File System
                  ▼
┌─────────────────────────────────────────────────────┐
│           CLAUDE API (Remoto - Gratuito)            │
│  • Análise de prospects                              │
│  • Geração de mensagens                              │
│  • Análise de respostas                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│        ARMAZENAMENTO LOCAL (/data)                   │
│  • prospects.json5 (índice de tudo)                  │
│  • [id]/metadata.json5 (empresa + contato)          │
│  • [id]/history.json5 (conversa completa)           │
│  • [id]/analyses.json5 (análises por data)          │
└─────────────────────────────────────────────────────┘
```

### Fluxo de Dados

**Cenário 1: Nova Prospecção**
1. Usuário preenche form (empresa, contato, segmento, etc)
2. Frontend envia POST `/api/analyze` com dados
3. Backend extrai informações
4. Backend chama Claude com prompt customizado
5. Claude retorna análise estruturada (estágio, objetivo, estratégia, etc)
6. Backend salva em `/data/[id]/`
7. Frontend exibe análise + mensagem sugerida

**Cenário 2: Continuar Conversa**
1. Usuário seleciona prospect da lista
2. Frontend carrega histórico completo (`/api/prospect/:id`)
3. Usuário insere resposta do prospect
4. Frontend envia POST `/api/continue` com ID e resposta
5. Backend recupera contexto completo (empresa, histórico)
6. Backend chama Claude com contexto completo
7. Claude retorna análise da resposta + próxima estratégia
8. Backend salva resposta e análise
9. Frontend exibe "O que significa" + estratégia + próxima mensagem

---

## C. ESTRUTURA DE ARQUIVOS FASE 1

```
saas-prospect/
├── README.md                     # Guia rápido
├── Claude.md                     # Especificação
├── PLANO_FASE_1.md              # Este arquivo
│
├── package.json                  # Dependências (mínimas)
├── .env.example                  # Exemplo de .env
│
├── src/
│  ├── index.js                  # Entry point (Express server)
│  ├── config.js                 # Configuração (portas, paths)
│  │
│  ├── routes/
│  │  └── api.js                 # Rotas da API
│  │
│  ├── services/
│  │  ├── claude.js              # Chamadas Claude API
│  │  ├── storage.js             # Leitura/escrita JSON
│  │  └── analysis.js            # Lógica de análise
│  │
│  └── utils/
│     ├── id-generator.js        # Gera IDs únicos
│     └── validators.js          # Valida inputs
│
├── public/
│  ├── index.html               # Página principal
│  ├── css/
│  │  ├── style.css             # Estilos globais
│  │  └── theme.css             # Temas (dark/light)
│  │
│  ├── js/
│  │  ├── app.js                # Lógica principal
│  │  ├── ui.js                 # Manipulação DOM
│  │  ├── api.js                # Chamadas fetch
│  │  └── storage-local.js      # localStorage para estado local
│  │
│  └── assets/
│     └── favicon.ico
│
├── data/                         # 📁 Criado em runtime
│  ├── prospects.json5           # Índice de prospects
│  ├── config.json5              # Configurações do usuário
│  └── [prospect-id]/            # Uma pasta por prospect
│     ├── metadata.json5
│     ├── history.json5
│     └── analyses.json5
│
└── tests/                        # (Fase 2+)
   └── api.test.js
```

### Tamanho esperado
- Código-fonte: ~50KB (sem node_modules)
- Dados por prospect: ~2-5KB (JSON)
- Total com 50 prospects: ~300KB

---

## D. FLUXO DE CÓDIGO FASE 1

### Inicialização
```
npm install
```
↓
```
CLAUDE_API_KEY=sk-... npm start
```
↓
Servidor inicia em `http://localhost:3000`
↓
Frontend carrega `index.html`
↓
JS faz GET `/api/prospects` para carregar lista

### Nova Prospecção
1. Usuário preenche form
2. `app.js` valida inputs
3. Fetch POST `/api/analyze` com dados
4. Backend (`routes/api.js`):
   - Gera ID único
   - Chama `claude.js` com prompt (análise inicial)
   - Salva resultado em `/data/[id]/metadata.json5`
   - Retorna análise + mensagem sugerida
5. Frontend exibe tudo (estágio, objetivo, estratégia, mensagem)
6. Usuário clica COPIAR MENSAGEM

### Continuar Conversa
1. Usuário seleciona prospect da lista
2. Frontend carrega histórico via GET `/api/prospect/:id`
3. Usuário insere resposta do prospect
4. Fetch POST `/api/continue` com `{ id, resposta }`
5. Backend:
   - Recupera histórico completo
   - Cria prompt contextual (todo o histórico anterior)
   - Chama Claude com contexto
   - Salva resposta em `/data/[id]/history.json5`
   - Salva análise em `/data/[id]/analyses.json5`
   - Retorna interpretação + estratégia + próxima mensagem
6. Frontend exibe análise

### Salvamento Local
Toda vez que há mudança:
```javascript
// Backend
fs.writeFileSync(`/data/${id}/history.json5`, 
  JSON5.stringify(history, null, 2))
```

Backup automático (opcional):
```javascript
// Cria cópia datada a cada análise
fs.copyFileSync(`/data/${id}/history.json5`,
  `/data/${id}/history_${timestamp}.json5`)
```

---

## E. WIREFRAME/LAYOUT

### Tela Principal (2 painéis)

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 PROSPEC.AI - Sistema de Prospecção Inteligente          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [📝 NOVA PROSPECÇÃO]  [📋 CONTINUAR CONVERSA]  [⚙️ Config] │
│                                                               │
├───────────────────────────┬───────────────────────────────────┤
│                           │                                   │
│  PAINEL ESQUERDO          │    PAINEL DIREITO                │
│  (Nova Prospecção)        │    (Continuar Conversa)           │
│                           │                                   │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐ │
│  │ Nome da Empresa:    │  │  │ 📋 Seus Prospects           │ │
│  │ [______________]    │  │  │ ┌─────────────────────────┐ │ │
│  │                     │  │  │ │ • Empresa A (Qualificado)│ │ │
│  │ Segmento:           │  │  │ │   João Silva            │ │ │
│  │ [dropdown ▼]        │  │  │ │   Último contato: hoje  │ │ │
│  │                     │  │  │ │                         │ │ │
│  │ Nome do Contato:    │  │  │ │ • Empresa B (Frio)      │ │ │
│  │ [______________]    │  │  │ │   Maria Costa           │ │ │
│  │                     │  │  │ │   Último contato: 3d    │ │ │
│  │ Cargo/Função:       │  │  │ │                         │ │ │
│  │ [autocomplete ▼]    │  │  │ │ [Filtro: todos ▼]       │ │ │
│  │                     │  │  │ └─────────────────────────┘ │ │
│  │ Info Adicional:     │  │  │                             │ │
│  │ [_____________]     │  │  │ AO ABRIR PROSPECT:          │ │
│  │ [_____________]     │  │  │ ┌─────────────────────────┐ │ │
│  │                     │  │  │ │ EMPRESA X               │ │ │
│  │ Site (opcional):    │  │  │ │ Contato: João Silva     │ │ │
│  │ [______________]    │  │  │ │ Cargo: Gerente          │ │ │
│  │                     │  │  │ │                         │ │ │
│  │ [🔍 ANALISAR]       │  │  │ │ HISTÓRICO:              │ │ │
│  │                     │  │  │ │ ✉️ Você: [1 dia atrás]  │ │ │
│  └─────────────────────┘  │  │ │ "Olá João..."           │ │ │
│                           │  │ │                         │ │ │
│  APÓS CLIQUE ANALISAR:    │  │ │ 📩 João: [hoje]         │ │ │
│  ┌─────────────────────┐  │  │ │ "Oi, quer me mostrar?" │ │ │
│  │ ✅ SITUAÇÃO ATUAL:   │  │  │ │                         │ │ │
│  │ Lead frio, respeitou │ │  │ │ [textarea: Resposta...] │ │ │
│  │                     │  │  │ │ [🔍 ANALISAR E CONTINUAR]│ │ │
│  │ 🎯 OBJETIVO:         │  │  │ └─────────────────────────┘ │ │
│  │ Gerar curiosidade    │  │  │                             │ │
│  │                     │  │  │ APÓS ANÁLISE:              │ │ │
│  │ 🧠 ESTRATÉGIA:       │  │  │ ┌─────────────────────────┐ │ │
│  │ Mostrar case de      │  │  │ │ 🎯 O QUE SIGNIFICA:    │ │ │
│  │ empresa similar      │  │  │ │ Mostrou interesse em    │ │ │
│  │                     │  │  │ │ conhecer ...            │ │ │
│  │ ⚠️ O QUE EVITAR:      │  │  │ │                         │ │ │
│  │ • Parecer agressivo  │  │  │ │ 📍 ONDE ESTAMOS:       │ │ │
│  │ • Vender já          │  │  │ │ Curioso → Interessado  │ │ │
│  │                     │  │  │ │                         │ │ │
│  │ 💬 MENSAGEM:         │  │  │ │ 🎯 OBJETIVO AGORA:     │ │ │
│  │ "Oi João,            │  │  │ │ Qualificar necessidade │ │ │
│  │                     │  │  │ │                         │ │ │
│  │ Vi que trabalha      │  │  │ │ 🧠 ESTRATÉGIA:         │ │ │
│  │ com [segmento].      │  │  │ │ Fazer pergunta sobre   │ │ │
│  │                     │  │  │ │ processo atual         │ │ │
│  │ A gente já fez      │  │  │ │                         │ │ │
│  │ coisa similar com    │  │  │ │ ⚠️ O QUE NÃO FAZER:    │ │ │
│  │ [empresa A].         │  │  │ │ • Parecer pressurante  │ │ │
│  │                     │  │  │ │ • Ignorar que já têm    │ │ │
│  │ Posso te mostrar     │  │  │ │   solução              │ │ │
│  │ em 10min?"           │  │  │ │                         │ │ │
│  │                     │  │  │ │ ⏱️ TIMING:             │ │ │
│  │ [📋 COPIAR] [🔄 ALT] │  │  │ │ Responder hoje         │ │ │
│  │                     │  │  │ │                         │ │ │
│  └─────────────────────┘  │  │ │ 💬 MENSAGEM:            │ │ │
│                           │  │ │ "Ótimo! Estou pensando  │ │ │
└───────────────────────────┴───┤ │ em como..."             │ │ │
                                │ │                         │ │ │
                                │ │ [📋 COPIAR] [🔄 ALT]   │ │ │
                                │ └─────────────────────────┘ │ │
                                └───────────────────────────────┘
```

### Design & Usabilidade
- **Tema**: Dark mode (padrão) + light mode (toggle)
- **Tipografia**: Monospace para dados, Sans-serif para texto
- **Cores**: Verde (sucesso/ação), Amarelo (atenção), Vermelho (risco)
- **Responsive**: Funciona em mobile (tablets), desktop otimizado
- **Responsividade**: 2 colunas no desktop, stack no mobile

---

## F. DEPENDÊNCIAS/BIBLIOTECAS

### Backend (Node.js)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.0.0",
    "node-json5": "^1.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0"
  }
}
```

**Justificativa**:
- **express**: Framework HTTP mínimo (1.5MB)
- **dotenv**: Carregar CLAUDE_API_KEY de `.env`
- **json5**: Ler/escrever JSON com comments (debug friendly)
- **uuid**: Gerar IDs únicos para prospects
- **nodemon**: Dev tool para reload automático

### Frontend
**Zero dependências** - apenas HTML/CSS/JS vanilla

**Bibliotecas CDN (opcional, apenas se necessário)**:
- `marked.js` (se quiser renderizar Markdown)
- Nada mais é necessário

---

## G. TIMELINE FASE 1

### Semana 1 (Dias 1-3): Setup + Frontend Básico
- [ ] Dia 1: Setup projeto, estrutura de pastas, git init
- [ ] Dia 1: Criar `index.html` com form básico
- [ ] Dia 2: CSS (layout 2 colunas, tema, responsive)
- [ ] Dia 3: JS frontend (validação form, exibição básica)
- **Checkpoint**: Página carregável e responsiva

### Semana 1 (Dias 4-5): Backend Mínimo
- [ ] Dia 4: Express server + rota `/api/prospects`
- [ ] Dia 4: Sistema de armazenamento JSON
- [ ] Dia 5: Integração Claude API (chamada simples)
- [ ] Dia 5: Rota `/api/analyze` funcionando
- **Checkpoint**: Chamada Claude API retorna análise

### Semana 2 (Dia 6): Integração Frontend-Backend
- [ ] Dia 6: Fetch calls no frontend
- [ ] Dia 6: Exibir análise no frontend
- [ ] Dia 6: Botão COPIAR MENSAGEM
- **Checkpoint**: Nova Prospecção end-to-end funcionando

### Semana 2 (Dias 7-8): Continuar Conversa
- [ ] Dia 7: Carregar histórico de prospect
- [ ] Dia 7: Rota `/api/continue` com contexto
- [ ] Dia 8: Exibir análise da resposta
- [ ] Dia 8: Salvar histórico completo
- **Checkpoint**: Continuar Conversa end-to-end funcionando

### Semana 2 (Dias 9-10): Testes & Refinamento
- [ ] Dia 9: Testes manuais (5+ prospects)
- [ ] Dia 9: Corrigir bugs menores
- [ ] Dia 10: Performance (lista com 20+ prospects)
- [ ] Dia 10: Documentação README
- **Checkpoint**: MVP estável e documentado

### Tarefas Críticas (Bloqueadores)
1. **CLAUDE_API_KEY**: Ter chave ativa antes de começar
2. **Estrutura de dados**: Definir schema JSON antes de salvar
3. **Prompts Claude**: Testar prompts manualmente antes de integrar

### Buffer
- 2-3 dias de margem para bugs não previstos
- Prioridade Fase 1: Funcionar > Bonito

---

## H. ARQUIVO .ENV

```bash
# .env (não commitar)
CLAUDE_API_KEY=sk-ant-v1-XXXXXXXXXXX...
PORT=3000
NODE_ENV=development
DATA_DIR=./data
```

---

## I. SCRIPT INICIALIZAÇÃO

### Quick Start
```bash
# 1. Clonar/baixar projeto
cd saas-prospect

# 2. Instalar dependências
npm install

# 3. Copiar .env.example para .env
cp .env.example .env

# 4. Adicionar sua chave Claude
# Edit .env e adicionar CLAUDE_API_KEY

# 5. Iniciar servidor
npm start

# 6. Abrir navegador
http://localhost:3000
```

---

## J. PRÓXIMOS PASSOS (Após Fase 1)

### Fase 2: Lógica de Análise Inteligente
- Detectar estágio com precisão
- Analisar nível de interesse
- Identificar objeções
- Recomendar timing

### Fase 3: Base de Conhecimento
- Exemplos por segmento
- Padrões de sucesso
- Recuperação de informações (RAG)

### Fase 4: UX Premium
- Dashboard com métricas
- Gráficos de progresso
- Export/Import de conversas
- Busca e filtros avançados

---

## K. RISCOS & MITIGAÇÕES

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Claude API lento | Usuário espera 5s+ | Cache de respostas, prompt otimizado |
| Perda de dados (crash) | Conversas perdidas | Backup automático a cada análise |
| Interface confusa | UX ruim | Testes com usuário real na Fase 2 |
| Chave API vazada | Acesso não autorizado | .env no .gitignore, docs sobre segurança |

---

**Status**: ✅ Planejamento completo  
**Próximo**: Iniciar desenvolvimento Fase 1 (ver README.md para setup)
