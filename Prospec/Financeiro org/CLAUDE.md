# CLAUDE.md — Dashboard Financeiro

## O que criar

Um arquivo único `gerenciador.html` — HTML + CSS + JavaScript vanilla. Abre direto no navegador. Sem backend, sem npm, sem dependências externas. Funciona offline.

---

## Custos fixos mensais (valores padrão editáveis)

| Item | Valor | Observação |
|------|-------|------------|
| VPS Hostinger KVM 2 | R$ 108,00/mês | Pagamento mensal sem contrato longo |
| MEI (DAS) | R$ 75,00/mês | Desativado por padrão — toggle para ativar quando abrir |

## Receita por cliente

| Item | Valor |
|------|-------|
| Setup (único) | Campo livre — padrão R$ 500,00 |
| Mensalidade | Campo livre — padrão R$ 350,00 |

## Custo de API Gemini por cliente (calcular individualmente)

O custo de API varia por cliente porque cada clínica tem um volume diferente de conversas. O dashboard deve pedir o campo **"conversas estimadas por mês"** ao cadastrar o cliente e calcular o custo automaticamente.

**Dados do modelo em uso: Gemini 3 Flash Preview**
- Preço de entrada: US$ 1,50 por 1 milhão de tokens
- Preço de saída: US$ 9,00 por 1 milhão de tokens
- Câmbio padrão: R$ 5,10 (editável nas configurações do dashboard)

**Estimativa de tokens por conversa no WhatsApp:**
- Cada conversa completa tem em média 8 trocas de mensagem (8 chamadas à API)
- Cada chamada à API envia o system prompt + histórico + mensagem nova como entrada, e recebe a resposta do bot como saída
- Média por chamada: ~2.000 tokens de entrada, ~200 tokens de saída
- Total por conversa: ~16.000 tokens de entrada, ~1.600 tokens de saída

**Fórmula para o dashboard:**

```
custo_entrada_usd = (conversas_mes × 16000 / 1_000_000) × 1.50
custo_saida_usd   = (conversas_mes × 1600  / 1_000_000) × 9.00
custo_total_brl    = (custo_entrada_usd + custo_saida_usd) × cambio
```

**Tabela de referência (para validar se o cálculo está correto):**

| Conversas/mês | Custo entrada (USD) | Custo saída (USD) | Total USD | Total BRL (R$ 5,10) |
|---------------|--------------------:|------------------:|----------:|--------------------:|
| 30            | $0,72               | $0,43             | $1,15     | R$ 5,87             |
| 50            | $1,20               | $0,72             | $1,92     | R$ 9,79             |
| 100           | $2,40               | $1,44             | $3,84     | R$ 19,58            |
| 150           | $3,60               | $2,16             | $5,76     | R$ 29,38            |
| 200           | $4,80               | $2,88             | $7,68     | R$ 39,17            |

**Exemplo com 5 clientes (100 conversas/mês cada):**
- API total: 5 × R$ 19,58 = R$ 97,90/mês
- VPS: R$ 108,00
- MEI: R$ 75,00
- **Custos totais: R$ 280,90/mês**
- Receita: 5 × R$ 350 = R$ 1.750,00
- **Sobra líquida: R$ 1.469,10/mês**

---

## Segurança (implementar antes de qualquer seção)

**Login com senha**
- Primeiro acesso: cadastro de senha (mínimo 8 caracteres)
- Acessos seguintes: tela de login
- Armazenar APENAS hash SHA-256 da senha — nunca texto puro
- Botão "Bloquear" visível no header — descarta chave da memória e volta ao login
- SEM auto-lock por inatividade
- Opção de trocar senha (exige senha atual)

**Criptografia AES-256 no localStorage**
- Todos os dados criptografados com SubtleCrypto (API nativa do browser)
- Fluxo: senha → PBKDF2 (100.000 iterações) → chave AES-GCM-256
- Salt aleatório gerado no primeiro acesso, salvo no localStorage
- IV aleatório a cada escrita
- Chave de criptografia APENAS em memória (variável JS) — nunca no localStorage/sessionStorage
- Fechar a aba do navegador descarta a chave automaticamente

**Backup**
- Exportar JSON criptografado (padrão — backup protegido)
- Opção de exportar descriptografado com aviso explícito na tela
- Importar: detecta se é criptografado ou não automaticamente

---

## Seções do dashboard

### A) Home (tela inicial após login)

Cards de resumo no topo:
- **Clientes ativos** — contagem de clientes com status "Ativo"
- **MRR** — soma das mensalidades dos clientes ativos
- **Custos do mês** — VPS + soma das APIs de todos clientes ativos + MEI (se ativo) + outros
- **Sobra líquida** — MRR + setups recebidos no mês − custos do mês
- **Prospects ativos** — total de prospects excluindo "Fechado", "Sem resposta" e "Recusou"

### B) Clientes

Campos do formulário:
- Nome da clínica (obrigatório)
- Nome do responsável
- Especialidade: Odontologia / Dermatologia / Fisioterapia / Clínica Médica / Estética / Outro
- WhatsApp (obrigatório)
- Valor do setup (R$) — padrão R$ 500,00
- Status do setup: Pago / Pendente
- Valor da mensalidade (R$) — padrão R$ 350,00
- Data de início
- **Conversas estimadas/mês** (número — obrigatório, usado para calcular custo de API)
- Status: Ativo / Em implantação / Cancelado
- Observações (texto livre)

Campos calculados (exibidos automaticamente, não editáveis):
- **Custo API Gemini/mês** — calculado pela fórmula acima com base nas conversas estimadas
- **Lucro líquido deste cliente** — mensalidade − custo API

Ações: editar, cancelar (com confirmação, mantém no histórico mas sai do cálculo de MRR)

### C) Prospects (CRM)

Campos do formulário:
- Nome da clínica (obrigatório)
- Especialidade: Odontologia / Dermatologia / Fisioterapia / Clínica Médica / Estética / Outro
- WhatsApp
- Cidade: Itajaí / Navegantes / Balneário Camboriú / Camboriú / Penha / Outra
- Origem: Google Maps / Instagram / Indicação / Outro
- Status do funil: Mapeado → Contatado → Interessado → Demo enviado → Negociando → Fechado / Sem resposta / Recusou
- Data do último contato
- Observações (texto livre)

Ações: editar, converter em cliente (abre formulário de cliente com dados pré-preenchidos), remover
Filtros: por cidade, por especialidade, por status do funil
Busca: por nome

### D) Financeiro

Visão mensal (mês selecionável):

**Receita:**
- Soma das mensalidades dos clientes ativos
- Setups recebidos no mês (dos clientes com setup "Pago" e data de início naquele mês)

**Custos:**
- VPS: R$ 108,00 (valor padrão, editável)
- API Gemini: soma automática do custo calculado de cada cliente ativo
- MEI: R$ 75,00 (toggle on/off)
- Outros: campo livre (valor + descrição)

**Resultado:**
- Sobra líquida = receita total − custos totais

**Visualizações:**
- Gráfico de barras dos últimos 6 meses: receita vs custos (canvas simples)
- Tabela de recebimentos do mês: data, cliente, tipo (setup/mensalidade), valor

### E) Prospecção (integrado ao CRM)

Esta seção fica dentro do card de cada prospect. Ao abrir um prospect, além dos dados normais aparecem 3 abas: **Dados**, **Mensagens** e **Histórico**.

#### Aba "Mensagens" — Templates de prospecção

Botões para gerar cada template já com os dados do prospect preenchidos automaticamente:

**Template 1 — Abordagem inicial:**
```
Oi [nome do responsável], tudo bem?

Eu desenvolvo um assistente virtual com IA para clínicas de saúde que atende pacientes 24h no WhatsApp — responde dúvidas sobre procedimentos, valores e convênios, e já organiza o pré-agendamento automaticamente.

Posso te enviar um vídeo de 45 segundos mostrando como funciona na prática?
```

**Template 2 — Follow-up (48h sem resposta):**
```
Oi [nome do responsável]! Só passando para ver se você teve chance de ver minha mensagem anterior 😊

Tenho um vídeo rápido de 45 segundos mostrando o bot funcionando ao vivo — vale a pena dar uma olhada. Posso enviar?
```

**Template 3 — Resposta ao "quanto custa?":**
```
O investimento é bem acessível:

• Setup: R$ 500 (configuração completa e personalizada para sua clínica — única vez)
• Mensalidade: R$ 350/mês (bot ativo 24h + suporte incluso)

Sem contrato longo e sem taxa de cancelamento.

Para você ter uma ideia, uma recepcionista custa R$ 2.000+/mês — e não atende às 2h da manhã 😄

Quer agendar 10 minutinhos para eu mostrar o bot funcionando com o nome da sua clínica?
```

**Template 4 — Envio do material (após interesse):**
```
Oi [nome do responsável]! Segue o vídeo de demonstração 👆

[anexar vídeo]

O bot que aparece no vídeo foi configurado para uma clínica odontológica fictícia, mas a gente personaliza 100% para o seu nicho — procedimentos, valores, horários e linguagem do jeito que a sua clínica fala com os pacientes.

Qualquer dúvida é só chamar!
```

Comportamento dos templates:
- Ao clicar em qualquer template, abre um modal com o texto já preenchido com o nome do responsável do prospect
- Botão "Copiar" — copia o texto para a área de transferência
- Botão "Registrar envio" — salva no histórico com data/hora e qual template foi usado
- O texto é editável antes de copiar — campo textarea no modal

#### Aba "Histórico de mensagens"

Lista cronológica de todas as mensagens registradas para aquele prospect:
- Data e hora do envio
- Qual template foi usado (ex: "Abordagem inicial", "Follow-up")
- Campo de observação livre (ex: "Respondeu que vai pensar", "Pediu o PDF")
- Atualiza o status do funil automaticamente quando certos templates são registrados:
  - Registrar "Abordagem inicial" → muda status para "Contatado"
  - Registrar "Material enviado" → muda status para "Demo enviado"

#### PDF do Contrato (ao converter prospect em cliente)

Quando o usuário clicar em "Converter em cliente", além do formulário de cliente, aparece um botão **"Gerar contrato PDF"** que gera e faz download de um PDF simples com:

**Conteúdo do contrato:**
- Título: "Contrato de Prestação de Serviços — Assistente Virtual WhatsApp"
- Data de emissão (automática)
- **Contratante:** nome da clínica + nome do responsável
- **Contratada:** Yago Ballester Gianni (prestador de serviços de tecnologia)
- **Objeto:** configuração e manutenção de assistente virtual com IA no WhatsApp para atendimento de pacientes
- **Escopo incluso:** configuração completa do bot, integração com WhatsApp, prompt personalizado para a clínica, suporte técnico
- **Escopo NÃO incluso:** mudanças de escopo após entrega, integrações com outros sistemas, criação de conteúdo além do prompt inicial
- **Valores:** setup R$ [valor] (pagamento único na assinatura) + mensalidade R$ [valor]/mês
- **Prazo de entrega:** até 48h após confirmação do pagamento do setup
- **SLA de suporte:** resposta em até 12h úteis
- **Cancelamento:** aviso com 30 dias de antecedência, sem multa
- **Assinaturas:** linha para Contratante + linha para Contratada, com cidade e data

Implementação do PDF:
- Usar a biblioteca `jsPDF` (CDN: https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js)
- Layout simples, fonte profissional, cabeçalho com título e data
- Download automático com nome: `contrato-[nome-da-clinica]-[data].pdf`

### F) Configurações

- Trocar senha
- Editar câmbio do dólar (padrão R$ 5,10)
- Editar valores padrão (VPS, MEI, mensalidade padrão, setup padrão)
- **Nome do prestador para o contrato** (padrão: "Yago Ballester Gianni")
- Exportar/importar backup
- Sobre: versão do dashboard

---

## Design

- **Dark mode** obrigatório
  - Fundo: `#0f1117`
  - Cards: `#1a1d27`
  - Texto principal: `#e2e8f0`
  - Texto secundário: `#94a3b8`
  - Bordas: `#2d3748`
- Cores funcionais:
  - Verde `#22c55e` → receita, ativo, lucro positivo
  - Vermelho `#ef4444` → cancelado, custo, lucro negativo
  - Azul `#3b82f6` → neutro, informação, links
  - Laranja `#f97316` → pendente, em implantação, atenção
  - Roxo `#a855f7` → prospects, funil
- Fonte: `Inter, system-ui, sans-serif`
- Cards: `border-radius: 12px`, sombra sutil
- Navbar lateral no desktop, bottom nav no mobile
- Transições suaves: `transition: 0.2s ease`
- Toasts/snackbars para feedback — sem `alert()`
- Mobile-first: funcionar a partir de 375px

---

## Comportamento

- Dados salvos automaticamente no localStorage após cada ação (criptografados)
- Confirmação antes de deletar ou cancelar qualquer registro
- Converter prospect em cliente: migra os dados, prospect sai do funil ativo
- Validação nos formulários: campos obrigatórios marcados, WhatsApp no formato (XX) XXXXX-XXXX
- Sem `console.log()` no código final
- Sem `alert()` — usar modais ou toasts
- Português brasileiro em toda a interface e nos comentários do código
- Compatível com Chrome e Safari mobile
