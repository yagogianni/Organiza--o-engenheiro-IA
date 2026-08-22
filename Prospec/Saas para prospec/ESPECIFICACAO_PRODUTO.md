# SaaS para Prospecção de Vendas - Especificação Completa

**Status**: Fase de Planejamento  
**Última atualização**: 2026-08-20

---

## 1. VISÃO GERAL DO PROJETO

Sistema de prospecção B2B inteligente que fornece orientação estratégica e mensagens personalizadas para abordagens de vendas, armazenando conversas localmente e análises em tempo real.

**Objetivo Principal**: Guiar vendedores na prospecção com análise contextual e mensagens humanizadas antes de enviar.

**Públicos**: Vendedores B2B, consultores de vendas, empreendedores em prospecção ativa.

---

## 2. INTERFACE DESEJADA

### 2.1 TELA 1: NOVA PROSPECÇÃO

**Input do usuário**:
- Nome da empresa
- Segmento (dropdown com opções comuns)
- Nome do contato
- Cargo/função (autocomplete ou dropdown)
- Informações adicionais (textarea livre)
- Site ou descrição (opcional)

**Output fornecido pelo sistema**:
- ✅ **SITUAÇÃO ATUAL**: Análise inicial (frio, potencial, contexto)
- ✅ **OBJETIVO**: Objetivo da primeira abordagem (qualificar, gerar curiosidade, iniciar diálogo)
- ✅ **ESTRATÉGIA**: Como abordar (Tom, ponto de entrada, diferencial)
- ✅ **O QUE EVITAR**: Erros comuns neste tipo de contato
- ✅ **MENSAGEM PARA ENVIAR**: Mensagem exata (pronta para copiar)
- 🔘 Botão **COPIAR MENSAGEM**
- 🔄 Opção **GERAR ALTERNATIVA** (nova variação da mensagem)

---

### 2.2 TELA 2: CONTINUAR CONVERSA

**Exibição**:
- Lista de prospecções existentes (com filtro por status/segmento)
- Ao abrir uma: histórico completo da conversa

**Fluxo**:
1. Usuário insere: **NOVA RESPOSTA DO PROSPECT** (texto recebido)
2. Ao clicar **ANALISAR E CONTINUAR**, sistema exibe:
   - 🎯 **O QUE SIGNIFICA**: Interpretação da resposta
   - 📍 **ONDE ESTAMOS NA VENDA**: Estágio atual (frio → fechamento)
   - 🎯 **OBJETIVO AGORA**: Próximo passo estratégico
   - 🧠 **ESTRATÉGIA RECOMENDADA**: Como proceder
   - ⚠️ **O QUE NÃO FAZER**: Armadilhas a evitar
   - 💬 **MENSAGEM PARA ENVIAR**: Próxima mensagem personalizada
   - 🔄 **ALTERNATIVA**: Variação da mensagem
   - ⏱️ **TIMING**: Quando enviar (imediato, esperar X horas, próxima semana)

---

## 3. REGRA MAIS IMPORTANTE

**Sistema deve ORIENTAR ANTES de gerar mensagem**.

Análise em 9 passos:
1. **Estágio atual** (frio, curioso, interessado, qualificado, avaliando, com objeção, parado, negociando, perto do fechamento, perdido)
2. **Intenção provável** (ignorar, dar mais info, desqualificar, agendar conversa, etc)
3. **Quem é o interlocutor** (decisor? gatekeeper? influenciador?)
4. **Objeções explícitas/implícitas** (preço? timing? solução alternativa?)
5. **Nível de interesse** (baixo, médio, alto)
6. **Objetivo da próxima interação** (o que queremos que ele faça)
7. **Estratégia recomendada** (tom, abordagem, diferencial)
8. **O que evitar** (erros que matariam a oportunidade)
9. **SÓ ENTÃO** gerar mensagem

---

## 4. CLASSIFICAÇÃO DO LEAD

### 4.1 Estágios de Venda
- **Frio**: Sem contato anterior
- **Curioso**: Abriu email, respondeu
- **Interessado**: Faz perguntas sobre o produto
- **Qualificado**: Tem orçamento, timeline, necessidade
- **Avaliando**: Considerando ativamente
- **Com objeção**: Tem impedimento específico (preço, timing, alternativa)
- **Parado**: Sem resposta por 2+ semanas
- **Em negociação**: Discutindo termos
- **Próximo do fechamento**: Aguardando apenas aprovação
- **Perdido**: Descartado ou descualificado

### 4.2 Nível de Interesse
- **Baixo**: Responde mas não engaja
- **Médio**: Faz perguntas, quer entender mais
- **Alto**: Quer agendar, pede demo, demonstra urgência

### 4.3 Tipo de Interlocutor
- **Secretária/Recepcionista**: Agendar com decisor
- **Assistente**: Passar info, pedir recomendação
- **Gatekeeper**: Qualificar, criar razão legítima para passar adiante
- **Influenciador**: Engajar, criar advocacia
- **Decisor/Dono**: Valor direto, CTA claro
- **Gestor/Responsável comercial**: ROI, integração, implementação
- **Médico/Dentista**: Resultado clínico, simplificação
- **Desconhecido**: Qualificar função antes de estratégia

---

## 5. REGRAS PARA MENSAGENS

### 5.1 Princípios de Redação
- ✅ Curtas, humanas, naturais, fáceis de ler
- ✅ 2-4 parágrafos curtos, sem blocos gigantes
- ✅ Linguagem conversacional, sem corporativo
- ✅ Não parecer automática ou template
- ✅ Sem urgência falsa, sem bajulação
- ✅ Baseada em informação real (site, LinkedIn, contexto)

### 5.2 Uma Mensagem = Um Objetivo
- ❌ Não tentar tudo na mesma mensagem
- ✅ Escolher UM microcompromisso:
  - Resposta simples (sim/não)
  - Uma pergunta (descobrir processo, dor, curiosidade)
  - Convite (agendar 15min, receber um documento)
  
### 5.3 Call-To-Action (CTA)
- Pergunta simples e baixa fricção
- Exemplos: "Posso te mostrar?", "Quer que eu te mostre isso em 10min?", "Faz sentido agir agora?"
- Nunca: "Vamos agendar uma reunião de 1 hora?" (alta fricção)

---

## 6. SITUAÇÕES ESPECIAIS & RECOMENDAÇÕES

### 6.1 "Já temos secretária"
- **Estratégia**: Valorizar estrutura, posicionar IA como apoio/evolução
- **Mensagem**: "Vejo que já têm um sistema. Posso ajudar a otimizar tempo da equipe?"

### 6.2 "Já temos chatbot"
- **Estratégia**: Entender como funciona, diferenciar quando houver contexto real
- **Mensagem**: "Vejo que já usam automação. Quer ver como a gente faz diferente?"

### 6.3 "Vou passar para responsável"
- **Recomendação**: Facilitar, criar ponte, NÃO pressionar
- **Ação**: Enviar documento de apoio ou agendamento simplificado

### 6.4 Prospect para de responder
- **Recomendação**: NÃO fazer follow-up genérico
- **Análise necessária**: Onde parou? Qual foi a última interação?
- **Ação**: Criar razão legítima para voltar (novo contexto, valor diferente)

### 6.5 Micro-padrões para detecção
- Responde mas com "não" ou "não é o momento" → Objeção de timing (salvar para depois)
- Faz muitas perguntas → Genuinamente interessado (aumentar tempo de resposta)
- Redireciona para outra pessoa → Gatekeeper (facilitar transição)
- Silêncio por 1 semana → Prioridade baixa (esperar + provocação leve)

---

## 7. ARMAZENAMENTO LOCAL

### 7.1 Persistência
Todas as conversas e dados armazenados **localmente** (sem servidor externo):
- ✅ Dados da empresa (nome, segmento, site, descrição)
- ✅ Dados do prospect (nome, cargo, contato, notas)
- ✅ Histórico completo da conversa (datas, mensagens enviadas, respostas)
- ✅ Análises e estratégias aplicadas
- ✅ Resultado final (convertido, perdido, parado, etc)

### 7.2 Formato
- **JSON** para simplicidade e portabilidade
- **Markdown** para históricos legíveis
- **SQLite** se escalar para 100+ conversas

### 7.3 Estrutura de dados
```
prospect/
  ├── id: string (gerado)
  ├── empresa: { nome, segmento, site, descricao }
  ├── contato: { nome, cargo, email, telefone }
  ├── historico: [ { data, tipo, conteudo, autor } ]
  ├── analises: [ { data, estágio, interesse, estratégia } ]
  ├── resultado: { status, data_fechamento, valor }
  └── timestamp: { criado, atualizado }
```

---

## 8. DESENVOLVIMENTO INCREMENTAL

### FASE 1 (SEMANA 1-2): MVP Funcional
- ✅ Estrutura básica do projeto
- ✅ Interface local (HTML/CSS/JS)
- ✅ Formulário "Nova Prospecção"
- ✅ Formulário "Continuar Conversa"
- ✅ Salvar conversas localmente (JSON)
- ✅ Exibir histórico

### FASE 2 (SEMANA 3): Lógica de Análise
- ✅ Implementar análise de estágio
- ✅ Implementar análise de interesse
- ✅ Implementar detecção de objeções
- ✅ Implementar recomendação de estratégia

### FASE 3 (SEMANA 4): Base de Conhecimento
- ✅ Integrar base de conhecimento local (padrões de sucesso)
- ✅ Exemplos de estratégias por segmento
- ✅ Padrões de respostas e objeções

### FASE 4 (SEMANA 5+): UX Melhorada
- ✅ Filtros e buscas avançadas
- ✅ Dashboard com métricas
- ✅ Export de conversas
- ✅ Customização de temas

---

## 9. RESTRIÇÕES & PRINCÍPIOS

### Sem:
- ❌ Serviços pagos (AWS, Vercel, etc)
- ❌ Supabase, banco de dados externo
- ❌ Stripe, pagamentos
- ❌ Integração WhatsApp, SMS
- ❌ CRM complexo
- ❌ Login, usuários, multi-tenancy

### Com:
- ✅ Tecnologias gratuitas e open-source
- ✅ Execução local
- ✅ Claude API (até limite gratuito)
- ✅ Simplicidade > perfeccionismo
- ✅ Funcionar agora > complexo depois

---

## 10. MÉTRICAS DE SUCESSO (Fase 1)

Um prospect pode ser:
- ✅ **Convertido**: Virou cliente/oportunidade real
- ❌ **Perdido**: Rejeitou, foi descartado
- ⏸️ **Parado**: Sem movimento por 2+ semanas
- 🔄 **Em progresso**: Ativo, respondendo

**Meta Fase 1**: Sistema funcional para rastrear 50+ conversas, sugerir estratégias e gerar mensagens em < 30 segundos.

---

## 11. GLOSSÁRIO

| Termo | Significado |
|-------|------------|
| **Microcompromisso** | Um objetivo pequeno e alcançável (resposta, pergunta, ação) |
| **Gatekeeper** | Assistente/secretária que controla acesso ao decisor |
| **Estágio** | Posição do prospect no funil de vendas |
| **Intenção** | O que o prospect provavelmente quer fazer a seguir |
| **Objeção** | Impedimento real ou percebido |
| **CTA** | Call-To-Action, convite à ação |
| **Follow-up** | Mensagem de acompanhamento |
| **Timing** | Quando enviar mensagem |

---

**Próximo passo**: Ver `PLANO_FASE_1.md` para detalhes técnicos e arquitetura.
