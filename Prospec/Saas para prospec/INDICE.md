# 📇 ÍNDICE DE ARQUIVOS - PROSPEC.AI

**Guia de Navegação Rápida do Projeto**

---

## 🎯 Por Onde Começar?

### Novo no Projeto?
1. Leia **README.md** (5 min)
2. Leia **Claude.md** (15 min)
3. Leia **PLANO_FASE_1.md** (20 min)
4. Pronto! Execute `npm start`

### Desenvolvedor Iniciando Fase 1?
1. Leia **DESENVOLVIMENTO.md** (10 min)
2. Siga os 6 passos de implementação
3. Consulte **ESTRUTURA_PASTAS.md** durante o desenvolvimento

### Querendo Entender a Arquitetura?
1. Leia **PLANO_FASE_1.md** seção "B. Arquitetura Geral"
2. Veja **ESTRUTURA_PASTAS.md** para hierarquia
3. Explore código em `/src` e `/public`

---

## 📚 DOCUMENTAÇÃO

### Estratégia & Especificação
| Arquivo | Tamanho | Propósito |
|---------|---------|----------|
| **Claude.md** | 12KB | 📋 Especificação completa (interface, regras, classificações) |
| **PLANO_FASE_1.md** | 23KB | 🔧 Tech stack, arquitetura, timeline |
| **README.md** | 9KB | 🚀 Quick start, funcionalidades, troubleshooting |
| **DESENVOLVIMENTO.md** | 11KB | 📝 Guia passo a passo implementação |
| **ESTRUTURA_PASTAS.md** | 10KB | 🗂️ Hierarquia, descrição arquivos |
| **SUMARIO_PLANEJAMENTO.md** | 11KB | 📊 Resumo executivo, checklist |
| **INDICE.md** | Este arquivo | 📇 Você está aqui |

---

## ⚙️ CONFIGURAÇÃO

| Arquivo | Propósito |
|---------|----------|
| **package.json** | Dependências Node.js (4 packages) |
| **.env.example** | Variáveis de ambiente (CLAUDE_API_KEY, PORT) |
| **.gitignore** | Arquivos ignorados pelo git |

### Setup
```bash
cp .env.example .env
# Editar .env: CLAUDE_API_KEY=sk-ant-...
npm install
npm start
```

---

## 🔧 BACKEND (src/)

### Entry Point
| Arquivo | Linhas | Propósito |
|---------|--------|----------|
| **src/index.js** | 50 | Express server, middleware, startup |

### Rotas da API
| Arquivo | Endpoints | Status |
|---------|-----------|--------|
| **src/routes/api.js** | POST /analyze, GET /prospects, GET /prospect/:id, POST /continue | Stubs (Implementar Fase 1) |

### Serviços
| Arquivo | Funções | Status |
|---------|---------|--------|
| **src/services/claude.js** | analyzeNewProspect(), continueConversation() | Stubs (Implementar Fase 1) |
| **src/services/storage.js** | saveProspect(), getProspect(), getAllProspects(), addToHistory() | Stubs (Implementar Fase 1) |
| **src/services/analysis.js** | determineStage(), determineInterestLevel(), detectObjections() | Stubs (Fase 2+) |

### Utilitários
| Arquivo | Funções | Status |
|---------|---------|--------|
| **src/utils/id-generator.js** | generateProspectId() | ✅ Pronto |
| **src/utils/validators.js** | validateNewProspect(), validateContinueInput() | ✅ Pronto |

---

## 🎨 FRONTEND (public/)

### HTML
| Arquivo | Tamanho | Seções |
|---------|---------|--------|
| **public/index.html** | 15KB | 2 abas (Nova Prospecção + Continuar), header, footer |

### Estilos
| Arquivo | Tamanho | Conteúdo |
|---------|---------|----------|
| **public/css/style.css** | 40KB | Layout 2col, forms, panels, buttons, animations |
| **public/css/theme.css** | 8KB | Dark/Light mode, CSS variables, scrollbar |

### JavaScript
| Arquivo | Funções | Propósito |
|---------|---------|----------|
| **public/js/app.js** | ~20 funções | Lógica principal, event handlers, tabs, forms |
| **public/js/api.js** | ~4 funções | Fetch wrapper, mock data, endpoints |
| **public/js/ui.js** | ~15 funções | DOM utilities (show, hide, setText, etc) |
| **public/js/storage-local.js** | ~10 funções | localStorage (tema, draft, filtros) |

---

## 📁 DADOS (data/)

Criado automaticamente em runtime.

### Estrutura
```
data/
├── prospects.json5      # Índice de prospects
├── config.json5         # Configurações globais
└── [prospect-id]/
    ├── metadata.json5   # Empresa + contato
    ├── history.json5    # Conversa completa
    └── analyses.json5   # Análises por data
```

### Exemplo
```json5
// data/prospects.json5
{
  "prospects": [
    {
      "id": "prosp_abc123_456",
      "empresa": "TechFlow",
      "contato": "João",
      "cargo": "Gerente",
      ...
    }
  ]
}
```

---

## 🔍 GUIA DE BUSCA RÁPIDA

### "Como instalar e rodar?"
→ **README.md** (seção "Quick Start")

### "Qual é a visão do projeto?"
→ **Claude.md** (seção "1. Visão Geral")

### "Como é a interface?"
→ **Claude.md** (seção "2. Interface Desejada")  
→ **PLANO_FASE_1.md** (seção "E. Wireframe")

### "Que tech stack escolhemos?"
→ **PLANO_FASE_1.md** (seção "A. Tech Stack")

### "Como os dados fluem?"
→ **PLANO_FASE_1.md** (seção "B. Arquitetura")  
→ **ESTRUTURA_PASTAS.md** (seção "Fluxo de Dados")

### "Por onde começo a programar?"
→ **DESENVOLVIMENTO.md** (seção "Implementação Passo a Passo")

### "Qual arquivo preciso editar?"
→ **ESTRUTURA_PASTAS.md** (com descrição de cada arquivo)

### "Como estruturar os dados JSON?"
→ **ESTRUTURA_PASTAS.md** (seção "data/")  
→ **PLANO_FASE_1.md** (seção "C. Estrutura de Arquivos")

### "Quais são os endpoints API?"
→ **src/routes/api.js** (comentários nos endpoints)  
→ **DESENVOLVIMENTO.md** (seção "Passo 4: API Routes")

### "Como chamar Claude API?"
→ **src/services/claude.js**  
→ **DESENVOLVIMENTO.md** (seção "Passo 3")

### "Como o frontend chama o backend?"
→ **public/js/api.js**  
→ **PLANO_FASE_1.md** (seção "D. Fluxo de Código")

### "Qual é o cronograma?"
→ **PLANO_FASE_1.md** (seção "G. Timeline")  
→ **DESENVOLVIMENTO.md** (seção "Checkpoints")

### "Quais são os próximos passos?"
→ **PLANO_FASE_1.md** (seção "J. Próximos Passos")  
→ **SUMARIO_PLANEJAMENTO.md** (seção "Próximas Fases")

---

## 🎯 CHECKLIST DESENVOLVIMENTO

### Antes de Começar
- [ ] Ler Claude.md completo
- [ ] Ler PLANO_FASE_1.md completo
- [ ] Ler DESENVOLVIMENTO.md
- [ ] Node.js v16+ instalado
- [ ] Claude API key configurada em .env

### Dia 1-2: Storage
- [ ] Implementar initializeDataDir()
- [ ] Implementar saveProspect()
- [ ] Implementar getProspect()
- [ ] Implementar getAllProspects()
- [ ] Testar salvamento em /data

### Dia 2-3: Claude API
- [ ] Implementar analyzeNewProspect()
- [ ] Implementar continueConversation()
- [ ] Testar com cURL/Postman
- [ ] Validar resposta JSON

### Dia 3-4: Backend Routes
- [ ] Implementar POST /api/analyze
- [ ] Implementar GET /api/prospects
- [ ] Implementar GET /api/prospect/:id
- [ ] Implementar POST /api/continue
- [ ] Testar todos endpoints

### Dia 4-5: Frontend Integration
- [ ] Remover mock data de api.js
- [ ] Implementar handleNewProspect()
- [ ] Implementar displayAnalysisResult()
- [ ] Testar form → análise → mensagem

### Dia 5-6: Continuar Conversa
- [ ] Implementar loadProspectsList()
- [ ] Implementar selectProspect()
- [ ] Implementar handleContinueConversation()
- [ ] Testar histórico → análise → estratégia

### Dia 7-10: Testes & Refinamento
- [ ] Testar com 5+ prospects
- [ ] Verificar responsividade
- [ ] Corrigir bugs
- [ ] Atualizar documentação

---

## 📊 MÉTRICAS

### Tamanho dos Arquivos
- **Documentação**: 76KB (7 arquivos MD)
- **Código Base**: 25KB (16 arquivos código)
- **Configuração**: 1KB (3 arquivos)
- **Total**: ~102KB

### Linhas de Código
- **Backend**: ~400 linhas (estrutura)
- **Frontend**: ~1500 linhas (estrutura)
- **Documentação**: ~2000 linhas
- **Total**: ~3900 linhas

### Dependências
- **NPM**: 4 packages (express, dotenv, json5, uuid)
- **CDN**: Nenhum (zero dependências frontend)
- **Externas**: Apenas Claude API

---

## 🚀 VELOCITY

### Tempo Leitura (Total: ~1.5 horas)
- Claude.md: 15 min
- PLANO_FASE_1.md: 20 min
- README.md: 5 min
- DESENVOLVIMENTO.md: 10 min
- Estrutura: 10 min

### Tempo Implementação (Fase 1: 10-14 dias)
- Setup: 1 dia
- Backend: 4-5 dias
- Frontend: 3-4 dias
- Testes: 2-3 dias

---

## 🎓 LEARNING RESOURCES

### Documentação
- Express.js: https://expressjs.com
- Claude API: https://docs.anthropic.com
- Node.js: https://nodejs.org
- JSON5: https://json5.org

### Ferramentas
- Postman: Testar endpoints
- VSCode: Editor (recomendado)
- DevTools: Debug frontend
- Terminal: npm commands

---

## 🔧 TROUBLESHOOTING

### "Não encontro o arquivo X"
→ Ver **ESTRUTURA_PASTAS.md** para localização exata

### "Qual arquivo preciso implementar?"
→ Ver **DESENVOLVIMENTO.md** seção "Implementação Passo a Passo"

### "Como testar endpoint?"
→ Ver **DESENVOLVIMENTO.md** seção "Teste Funcional"

### "Não entendo a arquitetura"
→ Ver **PLANO_FASE_1.md** seção "B. Arquitetura Geral"

### "Qual é o formato JSON esperado?"
→ Ver **ESTRUTURA_PASTAS.md** seção "data/"

---

## 📞 SUPORTE

### Documentação Aberta?
Leia o arquivo .md correspondente

### Código Confuso?
Veja os comentários no arquivo  
Consulte **DESENVOLVIMENTO.md**

### Precisa de Context Completo?
Leia **Claude.md** (especificação)

---

## ✅ CHECKLIST FINAL

- [x] 23 arquivos criados
- [x] 7 arquivos MD de documentação
- [x] Estrutura pronta para desenvolvimento
- [x] Guias passo a passo
- [x] Comentários em código
- [x] TODOs marcados
- [x] Setup.md criado
- [x] Pronto para Fase 1!

---

**Última atualização**: 2026-08-20  
**Versão**: 1.0  
**Status**: ✅ Planejamento Completo - Pronto para Desenvolvimento
