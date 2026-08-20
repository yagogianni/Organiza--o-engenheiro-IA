# 🎯 PROSPEC.AI - Sistema de Prospecção Inteligente

Ferramenta de prospecção B2B que fornece análise estratégica e mensagens personalizadas para vendas, armazenando tudo localmente.

**Status**: 🚀 Fase 1 (MVP) - Planejamento Completo

---

## ⚡ Quick Start

### Modo fácil (Windows)

1. Configure o `.env` uma vez só (copie `.env.example` para `.env` e adicione sua `GROQ_API_KEY`, gratuita em https://console.groq.com).
2. Dê duplo-clique em **`Iniciar PROSPEC.AI.bat`**. Ele instala dependências na primeira vez, sobe o servidor e abre o navegador sozinho.
3. Para parar, feche a janela preta que abriu.

### Modo manual

```bash
# 1. Clonar/baixar
git clone <repo> prospec-ai
cd prospec-ai

# 2. Instalar dependências
npm install

# 3. Configurar Groq API key (gratuita)
cp .env.example .env
# Editar .env e adicionar: GROQ_API_KEY=gsk_XXXX...

# 4. Iniciar servidor
npm start

# 5. Abrir navegador
# http://localhost:3000
```

---

## 📋 O que é

Sistema que:
- ✅ Coleta dados de novos prospects (empresa, contato, segmento)
- ✅ Analisa situação inicial e recomenda estratégia
- ✅ Gera mensagens personalizadas e humanizadas
- ✅ Rastreia conversa completa
- ✅ Analisa respostas e recomenda próximos passos
- ✅ Salva tudo localmente (sem servidor externo)

**Não é** CRM completo, integração WhatsApp, ou solução enterprise.

**É** ferramenta pessoal para vendedores que querem prospecção inteligente.

---

## 🎯 Funcionalidades Fase 1

### 1️⃣ Nova Prospecção
Você preenche:
- Nome da empresa
- Segmento (SaaS, Consultoria, Saúde, etc)
- Nome do contato
- Cargo/função
- Informações adicionais
- Site (opcional)

Sistema retorna:
- 📊 **SITUAÇÃO ATUAL**: Análise do ponto de partida
- 🎯 **OBJETIVO**: O que queremos com primeira abordagem
- 🧠 **ESTRATÉGIA**: Como abordar
- ⚠️ **O QUE EVITAR**: Erros a não cometer
- 💬 **MENSAGEM**: Pronta para copiar
- 🔄 **ALTERNATIVA**: Segunda versão da mensagem

### 2️⃣ Continuar Conversa
Você:
1. Seleciona prospect da lista
2. Vê histórico completo
3. Insere resposta que recebeu
4. Clica "ANALISAR E CONTINUAR"

Sistema fornece:
- 🎯 **O QUE SIGNIFICA**: Interpretação da resposta
- 📍 **ONDE ESTAMOS**: Estágio do funil
- 🎯 **OBJETIVO AGORA**: Próximo passo
- 🧠 **ESTRATÉGIA**: Como proceder
- ⚠️ **O QUE NÃO FAZER**: Armadilhas
- 💬 **PRÓXIMA MENSAGEM**: Sugestão personalizada
- ⏱️ **TIMING**: Quando enviar

---

## 🗂️ Estrutura do Projeto

```
prospec-ai/
├── Claude.md              # Especificação completa do projeto
├── PLANO_FASE_1.md        # Plano técnico detalhado
├── README.md              # Este arquivo
├── package.json           # Dependências
├── .env.example           # Exemplo de config
│
├── src/                   # Backend (Node.js)
│  ├── index.js            # Entry point
│  ├── routes/api.js       # API endpoints
│  ├── services/
│  │  ├── claude.js        # Chamadas Claude API
│  │  ├── storage.js       # Leitura/escrita JSON
│  │  └── analysis.js      # Lógica de análise
│  └── utils/
│
├── public/                # Frontend
│  ├── index.html          # Página principal
│  ├── css/                # Estilos
│  └── js/                 # JavaScript
│
└── data/                  # 📁 Criado automaticamente
   ├── prospects.json5     # Índice de prospects
   └── [id]/               # Uma pasta por prospect
```

---

## ⚙️ Requisitos

- **Node.js** v16+ (verificar com `node -v`)
- **Claude API key** (gratuita em https://console.anthropic.com)
- **Navegador moderno** (Chrome, Firefox, Safari, Edge)

---

## 🚀 Primeiros Passos Após Setup

### 1. Adicionar Chave Claude
```bash
# Editar .env
CLAUDE_API_KEY=sk-ant-v1-XXXXXXXXXXXXX
```

### 2. Iniciar Servidor
```bash
npm start
```
Você verá:
```
✅ Server rodando em http://localhost:3000
✅ Dados salvos em: ./data
```

### 3. Abrir Interface
Ir para: `http://localhost:3000`

### 4. Testar Nova Prospecção
- Empresa: "TechFlow Soluções"
- Segmento: "SaaS"
- Contato: "João Silva"
- Cargo: "Gerente"
- Info extra: "Empresa de software em SP"

Clicar "ANALISAR" e ver a magia acontecer ✨

### 5. Copiar Mensagem
Copiar a mensagem gerada e testar na realidade.

---

## 💾 Onde Ficam Meus Dados

Todos os dados são salvos em **`./data/`** (pasta no mesmo diretório do projeto):

```
data/
├── prospects.json5        # Lista de todos os prospects
├── [prospect-id]/
│  ├── metadata.json5      # Dados da empresa e contato
│  ├── history.json5       # Histórico de mensagens
│  └── analyses.json5      # Análises por data
```

**Benefícios**:
- ✅ Zero dependência de servidor externo
- ✅ Dados 100% privados
- ✅ Fácil fazer backup (copiar pasta `data/`)
- ✅ Fácil portar para outro computador

---

## 🔒 Segurança

- **CLAUDE_API_KEY**: Mantenha em `.env` (nunca commitar)
- **Dados locais**: Salvos apenas no seu computador
- **Sem login**: Sem usuários, sem servidor de auth
- **Sem internet**: Funciona offline (exceto chamadas Claude)

**⚠️ Importante**: Nunca compartilhe seu `.env`!

---

## 🧠 Como Funciona a Análise

Quando você clica "ANALISAR", o sistema:

1. **Extrai contexto**: Empresa, contato, segmento, info adicional
2. **Cria prompt inteligente**: Contextualizado para o tipo de prospect
3. **Chama Claude API**: Envio análise + contexto
4. **Recebe resposta estruturada**:
   ```
   {
     "estágio": "Frio",
     "interesse": "Médio",
     "objetivo": "Gerar curiosidade",
     "estratégia": "Mostrar case similar",
     "oQueEvitar": "Parecer genérico",
     "mensagem": "Oi João...",
     "alternativa": "Oi João, versão 2..."
   }
   ```
5. **Salva localmente**: Guarda tudo em JSON
6. **Exibe na tela**: Você vê análise + mensagem

---

## 📊 Classificações & Estágios

### Estágios de Venda
- **Frio**: Sem contato anterior
- **Curioso**: Respondeu, mas mostra ceticismo
- **Interessado**: Faz perguntas, quer saber mais
- **Qualificado**: Tem orçamento + timeline + necessidade
- **Avaliando**: Comparando com concorrentes
- **Com objeção**: Tem impedimento específico
- **Parado**: Sem resposta por 2+ semanas
- **Em negociação**: Discutindo termos
- **Perto do fechamento**: Aguarda apenas aprovação
- **Perdido**: Descartado ou descualificado

### Níveis de Interesse
- **Baixo**: Responde mas não engaja
- **Médio**: Faz perguntas, mostra curiosidade
- **Alto**: Quer agendar, pede demo, demonstra urgência

---

## 🎯 Estratégias Recomendadas

Sistema reconhece padrões:

| Situação | Estratégia |
|----------|-----------|
| Prospect frio, big company | Mostrar case de empresa similar |
| Disse "Já temos solução" | Diferenciar, posicionar como upgrade |
| Dirigiu para outro setor | Facilitar transição, criar bridge |
| Parou de responder | Nova razão legítima para retomar |
| Faz muitas perguntas | Genuinamente interessado → aumentar velocidade |

---

## 🔄 Fluxo Típico de Venda

```
FRIO (você inicia)
    ↓
    [Enviar mensagem 1]
    ↓
CURIOSO (respondeu, mas sem compromisso)
    ↓
    [Você analisa, envia mensagem 2]
    ↓
INTERESSADO (fez pergunta relevante)
    ↓
    [Você oferece valor, próxima conversa]
    ↓
QUALIFICADO (tem potencial real)
    ↓
    [Você facilita próximo passo - agendar, demo, etc]
    ↓
✅ SUCESSO OU ❌ PERDIDO
```

Sistema ajuda em cada passo.

---

## 🆘 Troubleshooting

### "Erro 401 quando clico ANALISAR"
- Verificar se CLAUDE_API_KEY está no `.env`
- Verificar se chave é válida em https://console.anthropic.com
- Reiniciar servidor: `npm start`

### "Dados não estão salvando"
- Verificar se pasta `data/` existe (criada automaticamente)
- Verificar permissões de escrita na pasta do projeto
- Checar console do Node.js (pode haver erro)

### "Interface muito lenta"
- Claude API pode levar 2-5s (é normal, não é seu PC)
- Verificar internet
- Tentar agentar `npm run dev` (com nodemon)

### "Perdi meus dados"
- Verificar em `./data/`
- Se deletou a pasta, dados foram realmente perdos
- **Sempre fazer backup** de `./data/` periodicamente

---

## 📈 Próximas Fases

### Fase 2: Lógica Inteligente (Semana 3)
- Análise mais precisa de estágio
- Detecção de objeções
- Recomendações de timing

### Fase 3: Base de Conhecimento (Semana 4)
- Exemplos por segmento
- Padrões de sucesso
- Recovery estratégico

### Fase 4: UX Premium (Semana 5+)
- Dashboard com métricas
- Gráficos de progresso
- Busca avançada
- Export de conversas

---

## 📞 Suporte & Feedback

Este é um projeto pessoal em desenvolvimento ativo.

**Bugs ou sugestões**:
- Abrir issue no repositório
- Descrever o comportamento inesperado
- Incluir dados anônimizados

---

## 📄 Licença

MIT - Livre para usar, modificar, distribuir.

---

## 🙏 Agradecimentos

- Claude (Anthropic) pela IA incrível
- Comunidade de vendedores que testaram a ideia

---

## 🚀 Vamos começar?

1. ✅ Setup: `npm install && npm start`
2. ✅ Testar: Nova Prospecção com sua empresa
3. ✅ Coletar feedback: Funciona para você?
4. 📈 Melhorar: Próximas fases baseadas em feedback real

**Dúvida?** Ver `Claude.md` (especificação) ou `PLANO_FASE_1.md` (técnico).

---

**Última atualização**: 2026-08-20  
**Status**: 🚀 Pronto para Fase 1
