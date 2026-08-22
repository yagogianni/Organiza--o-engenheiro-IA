# CLAUDE.md — Prospec.IA + Automation Engine

## Visão do Projeto

Estamos evoluindo o Prospec.IA para um ecossistema completo de prospecção.

O sistema será composto por três responsabilidades principais:

1. PROSPEC.IA
   - Interface principal do usuário.
   - Dashboard e pipeline.
   - Visualização dos leads.
   - Histórico completo das conversas.
   - Análise estratégica por IA.
   - Sugestão de próximas ações.
   - Apoio ao atendimento humano.

2. N8N
   - Motor operacional da automação.
   - Entrada e processamento de leads.
   - Disparo de mensagens.
   - Agendamento de follow-ups.
   - Monitoramento de respostas.
   - Atualização de estados.
   - Execução de regras operacionais.

3. BANCO DE DADOS / BACKEND
   - Fonte central de verdade.
   - Persistência de leads.
   - Persistência de mensagens.
   - Histórico de eventos.
   - Estado das automações.
   - Controle de campanhas.
   - Comunicação entre Prospec.IA e n8n.

IMPORTANTE:

O Prospec.IA NÃO deve ser tratado como o banco de dados.

O n8n NÃO deve ser tratado como a fonte principal de verdade.

Toda informação crítica deve possuir uma fonte central persistente.

---

# OBJETIVO DO SISTEMA

Construir uma máquina de prospecção capaz de:

1. Receber leads de diferentes fontes.
2. Organizar e enriquecer os dados dos leads.
3. Criar campanhas de prospecção.
4. Gerar mensagens personalizadas.
5. Enviar mensagens iniciais automaticamente.
6. Aguardar respostas.
7. Enviar follow-ups programados quando não houver resposta.
8. Interromper imediatamente a automação quando o lead responder.
9. Classificar a intenção da resposta.
10. Encaminhar oportunidades relevantes para atendimento humano.
11. Permitir que o Prospec.IA analise todo o histórico e recomende a melhor próxima ação.
12. Colocar leads sem resposta em período de descanso.
13. Permitir reativação futura.

O sistema deve ser modular, escalável e preparado para novos canais no futuro.

---

# PRINCÍPIO FUNDAMENTAL

Existem duas camadas de decisão:

## Camada operacional

Responsável por:

- Quando enviar.
- Para quem enviar.
- Quando fazer follow-up.
- Quando parar.
- Quando pausar.
- Quando reativar.

Essa camada é responsabilidade principalmente do n8n.

## Camada estratégica

Responsável por:

- O que dizer.
- Qual abordagem utilizar.
- Qual estágio da conversa.
- Qual intenção o lead demonstrou.
- Como responder.
- Qual deve ser a próxima ação.

Essa camada é responsabilidade do Prospec.IA e dos serviços de IA.

Não misturar essas responsabilidades desnecessariamente.

---

# ARQUITETURA DE DADOS

Antes de implementar qualquer automação, analisar a arquitetura atual do projeto.

Identificar:

- Stack utilizada.
- Estrutura do frontend.
- Backend existente.
- Banco de dados existente.
- ORM utilizado.
- APIs existentes.
- Onde os leads são armazenados.
- Onde o histórico das conversas é armazenado.
- Uso de localStorage.
- Uso de arquivos locais.
- Autenticação.
- Estrutura atual do pipeline.

NÃO alterar a arquitetura antes de apresentar uma análise.

Primeiro criar um documento técnico contendo:

1. Arquitetura atual.
2. Fluxo atual dos dados.
3. Limitações para integração com n8n.
4. Proposta de arquitetura futura.
5. Plano de migração.

---

# FONTE CENTRAL DE VERDADE

O sistema deve possuir um banco de dados central.

Todas as entidades importantes devem ser persistidas.

Entidades iniciais:

## Lead

Campos mínimos:

- id
- name
- company_name
- niche
- email
- phone
- website
- source
- status
- automation_enabled
- created_at
- updated_at

## Campaign

Representa uma campanha de prospecção.

Campos mínimos:

- id
- name
- niche
- channel
- status
- created_at
- updated_at

## LeadCampaign

Relaciona um lead a uma campanha.

Campos mínimos:

- id
- lead_id
- campaign_id
- stage
- follow_up_count
- last_contact_at
- next_action_at
- automation_enabled
- created_at
- updated_at

## Conversation

Representa uma conversa ou thread.

Campos mínimos:

- id
- lead_id
- channel
- external_thread_id
- status
- created_at
- updated_at

## Message

Representa qualquer mensagem enviada ou recebida.

Campos mínimos:

- id
- conversation_id
- lead_id
- direction
- content
- channel
- external_message_id
- sent_at
- received_at
- created_at

Direction:

- OUTBOUND
- INBOUND

## AutomationEvent

Registrar eventos importantes.

Exemplos:

- LEAD_CREATED
- INITIAL_MESSAGE_SENT
- FOLLOW_UP_SENT
- RESPONSE_RECEIVED
- AUTOMATION_PAUSED
- LEAD_HANDOFF
- CAMPAIGN_STOPPED

---

# ESTADOS DO LEAD

Os estados devem ser explícitos.

Sugestão inicial:

- NEW
- READY_FOR_OUTREACH
- OUTREACH_ACTIVE
- WAITING_RESPONSE
- FOLLOW_UP_1
- FOLLOW_UP_2
- FOLLOW_UP_3
- HUMAN_REVIEW
- ENGAGED
- PAUSED
- RESTING
- REACTIVATION
- NOT_INTERESTED
- CLOSED

Não criar novos estados sem justificar.

Sempre verificar se é melhor representar uma informação como:

- status
- evento
- contador
- flag
- relacionamento

Evitar criar estados redundantes.

---

# REGRA CRÍTICA DE AUTOMAÇÃO

Nenhuma mensagem automática pode ser enviada para um lead quando:

automation_enabled = false

Essa verificação deve acontecer imediatamente antes de qualquer envio.

Não confiar apenas em delays ou estados antigos.

Exemplo:

1. Workflow de follow-up encontra o lead.
2. Lead responde segundos depois.
3. O workflow chega ao ponto de envio.
4. Antes do envio, deve consultar novamente o estado atual.
5. Se automation_enabled = false, cancelar o envio.

Essa regra é obrigatória.

---

# WORKFLOW 1 — INGESTÃO DE LEADS

Responsável por receber leads de:

- Google Maps.
- Pesquisa na internet.
- APIs.
- Listas.
- CSV.
- Inserção manual.
- Outras fontes futuras.

Fluxo:

LEAD RECEBIDO
↓
VALIDAR DADOS
↓
NORMALIZAR
↓
DEDUPLICAR
↓
CRIAR OU ATUALIZAR LEAD
↓
REGISTRAR EVENTO
↓
MARCAR COMO READY_FOR_OUTREACH

Não enviar mensagens diretamente neste workflow.

---

# WORKFLOW 2 — MOTOR DE OUTREACH

Responsável pelo primeiro contato.

Fluxo:

BUSCAR LEADS ELEGÍVEIS
↓
VERIFICAR automation_enabled
↓
COLETAR CONTEXTO
↓
SOLICITAR ANÁLISE E MENSAGEM
↓
VALIDAR MENSAGEM
↓
REVALIDAR ESTADO DO LEAD
↓
ENVIAR
↓
REGISTRAR MESSAGE
↓
REGISTRAR EVENTO
↓
ATUALIZAR STATUS
↓
AGENDAR PRÓXIMA AÇÃO

Após o envio:

status = WAITING_RESPONSE

follow_up_count = 0

next_action_at = agora + intervalo configurável

---

# WORKFLOW 3 — MOTOR DE FOLLOW-UP

Executar periodicamente.

Buscar apenas leads onde:

- automation_enabled = true
- status permite follow-up
- next_action_at <= agora

Antes de gerar ou enviar:

1. Revalidar estado.
2. Verificar se existe resposta recente.
3. Verificar limite de follow-ups.
4. Verificar se o lead está em período de descanso.

Fluxo:

LEAD ELEGÍVEL
↓
RECUPERAR HISTÓRICO
↓
GERAR ESTRATÉGIA
↓
GERAR FOLLOW-UP
↓
REVALIDAR ESTADO
↓
ENVIAR
↓
REGISTRAR
↓
INCREMENTAR CONTADOR
↓
AGENDAR PRÓXIMA AÇÃO

Limite inicial:

3 follow-ups.

Após o limite:

status = RESTING

automation_enabled = false

Registrar a data de possível reativação.

---

# WORKFLOW 4 — MONITORAMENTO DE RESPOSTAS

Monitorar continuamente os canais de comunicação.

Fluxo:

MENSAGEM RECEBIDA
↓
IDENTIFICAR THREAD / REMETENTE
↓
IDENTIFICAR LEAD
↓
VERIFICAR DUPLICIDADE
↓
REGISTRAR MENSAGEM
↓
PAUSAR AUTOMAÇÃO IMEDIATAMENTE
↓
RECUPERAR HISTÓRICO
↓
ANALISAR INTENÇÃO
↓
CLASSIFICAR
↓
ATUALIZAR ESTADO
↓
ENVIAR PARA PROSPEC.IA

IMPORTANTE:

A pausa da automação deve acontecer ANTES da análise de IA.

Se uma mensagem humana legítima for recebida:

automation_enabled = false

Isso evita que um follow-up seja enviado enquanto a IA ainda está analisando a resposta.

Classificações iniciais:

- INTERESTED
- ENGAGED
- QUESTION
- OBJECTION
- NOT_INTERESTED
- AUTO_REPLY
- UNKNOWN

Se:

INTERESTED
ENGAGED
QUESTION
OBJECTION

Então:

status = HUMAN_REVIEW

Se:

NOT_INTERESTED

Então:

status = NOT_INTERESTED

Se:

AUTO_REPLY

Não pausar definitivamente a sequência sem regra específica.

---

# WORKFLOW 5 — HANDOFF PARA ATENDIMENTO HUMANO

Quando um lead atingir:

status = HUMAN_REVIEW

Ele deve aparecer no Prospec.IA como prioridade.

Exibir:

- Dados do lead.
- Histórico completo.
- Última mensagem.
- Análise da IA.
- Classificação.
- Estágio da conversa.
- Estratégia recomendada.
- Próxima ação recomendada.
- Sugestão de resposta.

Neste estágio:

O sistema NÃO deve responder automaticamente.

O humano assume a comunicação.

---

# WORKFLOW 6 — REATIVAÇÃO

Leads em:

status = RESTING

Podem futuramente entrar em uma campanha de reativação.

O workflow deve:

1. Identificar leads elegíveis.
2. Verificar tempo mínimo de descanso.
3. Verificar se não houve contato recente.
4. Gerar uma abordagem diferente.
5. Criar uma nova tentativa de contato.
6. Registrar o ciclo de reativação.

Não reutilizar automaticamente a mesma sequência anterior.

---

# INTEGRAÇÃO COM PROSPEC.IA

O Prospec.IA deve consumir os dados centralizados.

O dashboard deve refletir em tempo quase real:

- Leads novos.
- Leads em automação.
- Leads aguardando resposta.
- Follow-ups pendentes.
- Respostas recebidas.
- Leads aguardando atendimento humano.
- Leads em descanso.
- Leads encerrados.

O Prospec.IA também deve fornecer contexto estratégico para a automação.

Exemplo de fluxo:

n8n
↓
Solicita contexto do lead
↓
Prospec.IA / serviço de IA
↓
Retorna:

- análise
- estratégia
- objetivo
- mensagem sugerida
- próxima ação

O n8n executa a ação.

---

# IDEMPOTÊNCIA

Todos os workflows devem ser projetados para evitar duplicações.

Exemplos:

- Não registrar a mesma resposta duas vezes.
- Não enviar duas mensagens iniciais.
- Não enviar dois follow-ups simultaneamente.
- Não criar o mesmo lead duas vezes.
- Não processar duas vezes o mesmo evento de e-mail.

Sempre utilizar identificadores externos quando disponíveis.

---

# CONCORRÊNCIA E RACE CONDITIONS

Considerar sempre cenários onde múltiplos workflows executam ao mesmo tempo.

Exemplo crítico:

Workflow de follow-up:
"Vou enviar mensagem para Lead X"

Ao mesmo tempo:

Workflow de respostas:
"Lead X acabou de responder"

A resposta deve ter prioridade.

A automação deve ser pausada imediatamente.

Antes do envio, o workflow deve consultar novamente o estado atual.

---

# LOGS E AUDITORIA

Toda ação importante deve gerar um evento.

Precisamos conseguir responder:

- Quem enviou essa mensagem?
- Qual workflow enviou?
- Quando foi enviada?
- Qual campanha?
- Qual estratégia foi usada?
- Qual prompt gerou a mensagem?
- Qual modelo de IA foi utilizado?
- Qual resposta foi recebida?
- Por que a automação foi pausada?

Evitar comportamento invisível.

---

# IMPLEMENTAÇÃO

NÃO implementar todo o sistema de uma vez.

Seguir esta ordem:

FASE 1
- Analisar o projeto atual.
- Mapear arquitetura.
- Identificar persistência atual.
- Propor arquitetura futura.

FASE 2
- Definir banco de dados.
- Criar schema.
- Criar migração dos dados existentes.
- Validar a fonte central de verdade.

FASE 3
- Criar integração básica entre Prospec.IA e banco.
- Garantir leitura e escrita dos leads.
- Garantir histórico de mensagens.

FASE 4
- Construir workflow de ingestão de leads.

FASE 5
- Construir workflow de primeiro contato.

FASE 6
- Construir workflow de monitoramento de respostas.

FASE 7
- Construir workflow de follow-ups.

FASE 8
- Implementar handoff para atendimento humano.

FASE 9
- Implementar reativação.

FASE 10
- Observabilidade.
- Logs.
- Tratamento de erros.
- Testes de concorrência.
- Proteções contra duplicidade.

---

# REGRAS PARA ALTERAÇÃO DO PROJETO

Antes de fazer alterações estruturais:

1. Explicar o problema.
2. Explicar a solução proposta.
3. Mostrar quais arquivos serão afetados.
4. Identificar riscos.
5. Implementar de forma incremental.

Não reescrever grandes partes do projeto sem necessidade.

Preservar funcionalidades existentes do Prospec.IA.

---

# COMO TRABALHAR

Quando receber uma tarefa:

1. Primeiro entender o estado atual do projeto.
2. Identificar dependências.
3. Procurar soluções já existentes no código.
4. Não criar abstrações desnecessárias.
5. Implementar incrementalmente.
6. Testar.
7. Explicar o resultado.
8. Atualizar a documentação quando necessário.

Sempre priorizar:

- simplicidade
- rastreabilidade
- modularidade
- segurança operacional
- prevenção de mensagens duplicadas
- prevenção de follow-ups após resposta
