# 🔧 DESENVOLVIMENTO - Guia Prático Fase 1

**Para desenvolvedores que vão implementar a Fase 1**

---

## ⚡ Quick Start Desenvolvimento

```bash
# 1. Clonar/abrir projeto
cd "D:\CODE\Organização engenheiro IA\Prospec\Saas para prospec"

# 2. Instalar dependências
npm install

# 3. Criar arquivo .env
cp .env.example .env
# Editar .env e adicionar CLAUDE_API_KEY

# 4. Iniciar servidor (sem watch)
npm start

# 5. Iniciar com auto-reload (desenvolvimento)
npm run dev
# Requer: npm install -D nodemon (já no package.json)

# 6. Abrir navegador
# http://localhost:3000
```

---

## 📋 Tarefas Fase 1 (Prioridade)

### Nível 1: CRÍTICO (Bloqueadores)
- [ ] Implementar `POST /api/analyze` no backend
  - [ ] Validar dados de entrada
  - [ ] Chamar Claude API
  - [ ] Salvar em `/data`
  - [ ] Retornar análise estruturada

- [ ] Conectar Frontend → Backend (app.js)
  - [ ] Form validação
  - [ ] Fetch chamada
  - [ ] Exibir resultados

- [ ] Armazenamento funcional (storage.js)
  - [ ] Criar `/data` em runtime
  - [ ] Salvar prospects.json5
  - [ ] Salvar pasta [id]/ com metadata.json5

### Nível 2: IMPORTANTE (Funcionalidade Principal)
- [ ] Implementar `GET /api/prospects`
  - [ ] Listar todos os prospects salvos
  - [ ] Retornar dados básicos

- [ ] Implementar `GET /api/prospect/:id`
  - [ ] Recuperar dados + histórico completo
  - [ ] Retornar conversas formatadas

- [ ] Implementar `POST /api/continue`
  - [ ] Receber resposta do prospect
  - [ ] Chamar Claude com contexto
  - [ ] Salvar nova resposta + análise

### Nível 3: COMPLEMENTO (UX)
- [ ] Listar prospects no frontend (app.js)
  - [ ] Carregar via GET /api/prospects
  - [ ] Renderizar com search/filter

- [ ] Exibir histórico (app.js)
  - [ ] Carregar conversa formatada
  - [ ] Exibir em timeline

- [ ] Mensagem alternativa
  - [ ] Chamar Claude API novamente
  - [ ] Usar prompt para "gerar variação"

---

## 🛠️ Implementação Passo a Passo

### PASSO 1: Validação & Estrutura de Dados

**Arquivo**: `src/utils/validators.js`
- ✅ Já existe estrutura
- TODO: Expandir validações

**Arquivo**: `src/config.js` (criar novo!)
```javascript
export const DATA_DIR = process.env.DATA_DIR || './data';
export const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
export const PORT = process.env.PORT || 3000;
```

---

### PASSO 2: Armazenamento (Storage)

**Arquivo**: `src/services/storage.js`

Implementar:
```javascript
// Inicializar pasta /data
export async function initializeDataDir() {
  // Criar /data se não existir
}

// Salvar novo prospect
export async function saveProspect(prospectData, analysis) {
  // 1. Gerar ID único
  // 2. Criar pasta /data/[id]/
  // 3. Salvar metadata.json5
  // 4. Salvar history.json5 (array vazio)
  // 5. Salvar analyses.json5 (array com primeira análise)
  // 6. Atualizar prospects.json5 (índice)
}

// Carregar todos
export async function getAllProspects() {
  // Ler /data/prospects.json5
}

// Carregar um
export async function getProspect(id) {
  // Ler metadata + history + analyses
  // Combinar tudo
}

// Adicionar ao histórico
export async function addToHistory(id, msg, tipo) {
  // Ler history.json5
  // Adicionar nova entrada { date, tipo, conteudo }
  // Salvar
}
```

**Schema esperado**:
```json5
// prospects.json5
{
  "prospects": [
    {
      "id": "prosp_abc123_456",
      "empresa": "TechFlow",
      "contato": "João",
      "cargo": "Gerente",
      "segmento": "SaaS",
      "dateCreated": "2024-08-20T14:30:00Z"
    }
  ]
}
```

---

### PASSO 3: Claude API Integration

**Arquivo**: `src/services/claude.js`

Implementar:
```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

export async function analyzeNewProspect(prospectData) {
  const prompt = buildAnalysisPrompt(prospectData);
  
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });
  
  // Parse response e retornar JSON estruturado
  return parseAnalysisResponse(message.content[0].text);
}

function buildAnalysisPrompt(data) {
  return `
    Você é especialista em prospecção B2B e vendas.
    
    Prospect:
    - Empresa: ${data.empresa}
    - Segmento: ${data.segmento}
    - Contato: ${data.contato}
    - Cargo: ${data.cargo}
    - Info: ${data.info}
    - Site: ${data.site || 'N/A'}
    
    Forneça análise em JSON com campos:
    {
      "situacaoAtual": "...",
      "objetivo": "...",
      "estrategia": "...",
      "oQueEvitar": "...",
      "mensagem": "...",
      "alternativa": "..."
    }
  `;
}

function parseAnalysisResponse(text) {
  // Extract JSON from text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  return JSON.parse(jsonMatch[0]);
}
```

---

### PASSO 4: API Routes

**Arquivo**: `src/routes/api.js`

Implementar:
```javascript
import { analyzeNewProspect, continueConversation } from '../services/claude.js';
import { 
  saveProspect, 
  getProspect, 
  getAllProspects, 
  addToHistory 
} from '../services/storage.js';
import { validateNewProspect } from '../utils/validators.js';

// POST /api/analyze
router.post('/analyze', async (req, res) => {
  try {
    validateNewProspect(req.body);
    const analysis = await analyzeNewProspect(req.body);
    const saved = await saveProspect(req.body, analysis);
    res.json({ ...saved, ...analysis });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/prospects
router.get('/prospects', async (req, res) => {
  try {
    const prospects = await getAllProspects();
    res.json(prospects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospect/:id
router.get('/prospect/:id', async (req, res) => {
  try {
    const prospect = await getProspect(req.params.id);
    res.json(prospect);
  } catch (error) {
    res.status(404).json({ error: 'Prospect not found' });
  }
});

// POST /api/continue
router.post('/continue', async (req, res) => {
  try {
    const { id, resposta } = req.body;
    const prospect = await getProspect(id);
    
    // Salvar resposta
    await addToHistory(id, resposta, 'incoming');
    
    // Analisar com contexto
    const analysis = await continueConversation(prospect, resposta);
    
    // Salvar análise
    // TODO: Implementar salvamento de análise
    
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

### PASSO 5: Frontend API Calls

**Arquivo**: `public/js/api.js`

Remover mock data e implementar chamadas reais:
```javascript
// Remove o `if (true)` das funções e deixa apenas fetch real

export async function analyzeNewProspect(prospectData) {
  return fetchAPI('/analyze', {
    method: 'POST',
    body: JSON.stringify(prospectData)
  });
}

// Etc...
```

---

### PASSO 6: Frontend Event Handlers

**Arquivo**: `public/js/app.js`

Já tem skeleton, implementar:
- ✅ Form submission (`handleNewProspect`)
- ✅ Exibir resultados (`displayAnalysisResult`)
- ✅ Carregar prospects list
- ✅ Selecionar prospect e carregar histórico
- ✅ Análise de continuação

---

## 🧪 Teste Funcional

Depois de implementar Nível 1:

```bash
# Terminal 1: Servidor
npm start

# Terminal 2: Testes manuais via cURL ou Postman

# Testar análise nova
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "empresa": "Test Corp",
    "segmento": "SaaS",
    "contato": "John",
    "cargo": "Manager",
    "info": "Tech company",
    "site": "test.com"
  }'

# Testar listagem
curl http://localhost:3000/api/prospects

# Testar detalhe (após criar prospect)
curl http://localhost:3000/api/prospect/[ID]
```

---

## 🐛 Debug Tips

### Console Backend
```javascript
console.log('DEBUG:', req.body);
console.error('ERROR:', error.stack);
```

### Console Frontend
```javascript
// In browser DevTools
localStorage.debugShowStorage();
```

### Inspecionar dados salvos
```bash
# No terminal, ver pasta /data
ls -la data/
cat data/prospects.json5
cat data/[prospect-id]/metadata.json5
```

---

## 📝 Prompt Claude para Análise

**Dica**: Nível de detalhe impacta qualidade

```
Você é especialista em prospecção B2B.

PROSPECT:
- Empresa: ${empresa}
- Segmento: ${segmento}  
- Contato: ${contato}
- Cargo: ${cargo}
- Info: ${info}

Analise e retorne JSON com:
1. situacaoAtual: Análise breve (2-3 linhas)
2. objetivo: O que queremos (1 frase)
3. estrategia: Como abordar (2-3 linhas)
4. oQueEvitar: 3-4 erros comuns (bullets)
5. mensagem: Mensagem exata (pronta para copiar)
6. alternativa: Variação da mensagem

IMPORTANTE:
- Mensagem curta (3-4 parágrafos)
- Tom humanizado, sem parecer template
- Sem urgência falsa ou pressão
```

---

## 🎯 Checkpoints Fase 1

**Checkpoint 1 (Dia 3)**:
- [ ] Nova Prospecção funciona end-to-end
- [ ] Dados salvos em /data/
- [ ] Mensagem gerada e copiável

**Checkpoint 2 (Dia 6)**:
- [ ] Lista de prospects carregável
- [ ] Histórico de conversa exibível
- [ ] POST /api/continue implementado

**Checkpoint 3 (Dia 10)**:
- [ ] Tudo testado com 5+ prospects
- [ ] Sem crashes ou erros graves
- [ ] UI responsiva (desktop + mobile)

---

## 🚨 Possíveis Problemas & Soluções

| Problema | Solução |
|----------|---------|
| "API key inválida" | Checar `.env`, usar chave válida de https://console.anthropic.com |
| "Pasta /data não cria" | Checar permissões de escrita, usar caminho absoluto |
| "Mock data nunca sai" | Remover `if (true)` de api.js e deixar chamada fetch real |
| "CORS error" | Frontend e backend na mesma origem (localhost:3000), sem problema |
| "JSON5 parse error" | Validar JSON5 syntax em /data files |
| "Timeout Claude" | Claude pode levar 2-5s, é normal, adicionar timeout maior |

---

## 📚 Referências Úteis

### Documentação
- Claude API: https://docs.anthropic.com
- Express.js: https://expressjs.com
- Node.js fs: https://nodejs.org/api/fs.html
- JSON5: https://json5.org

### Ferramentas Recomendadas
- **Postman**: Testar endpoints
- **VSCode**: Editor de código (tem extensions Node.js)
- **Terminal**: npm commands
- **DevTools Chrome**: Debug frontend

---

## ✅ Definição de Pronto (Fase 1)

Fase 1 está pronta quando:
1. Nova Prospecção funciona end-to-end (form → análise → cópia)
2. Continuar Conversa funciona (carregar → analisar resposta → próxima mensagem)
3. Dados persistem localmente (sem perder em refresh)
4. Interface é responsiva (desktop + mobile)
5. Sem crashes ou erros console
6. Documentação atualizada (se mudou algo, update README)

---

**Próximo**: Começar com PASSO 1 acima!

**Tempo estimado**: 7-10 dias  
**Última atualização**: 2026-08-20
