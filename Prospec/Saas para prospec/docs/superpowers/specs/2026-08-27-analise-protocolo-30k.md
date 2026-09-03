# Análise — Protocolo 30K (ferramentas do curso do Pedro Sobral)

**Fonte**: https://protocolo-30k-ferramentas.vercel.app/ — 8 ferramentas browser-based,
sem cadastro, dados salvos localmente no navegador do usuário (não é um sistema
integrável via API — é um kit de referência/conteúdo, não uma automação).

## 1. O que existe no site

| # | Ferramenta | O que é | Extração |
|---|---|---|---|
| 1 | Calculadora Meta 30K | MRR/ticket → meta diária de conversas | resumo (calculadora simples) |
| 2 | Máquina de Diagnóstico | usuário descreve o travamento → sugestão | parcial (wizard JS) |
| 3 | Construtor de ICP | 7 etapas pra definir cliente ideal | completo (estrutura) |
| 4 | Gerador de Cadência | plano de 7 dias por nicho/canal | completo (regras) |
| 5 | Arsenal de Scripts | 29 mensagens prontas | **completo** (texto integral) |
| 6 | Painel de Prospecção | CRM local (contatos, streak, CSV) | resumo (é um Excel disfarçado) |
| 7 | Simulador de Objeções | 12 objeções x resposta | parcial (só a estrutura, conteúdo é wizard) |
| 8 | Playbook Comercial | 10 seções, exporta PDF | parcial (só sabemos que existem 10) |

Ferramentas 6 e 8 são **para uso manual da mãe/você**, não pra virar automação —
é um Excel/PDF preenchível localmente, sem API, sem exportação estruturada. Não
tem o que "integrar" no Prospec.IA além de inspirar campos.

## 2. Cruzamento com as regras já em vigor no Prospec.IA

Regras já estabelecidas (ver `[[feedback_copywriting_no_ai_tells]]`,
`[[project_prospec_roadmap]]` 2026-08-25, e os commits recentes de fechamento):

- Sem em-dash, sem tom robótico.
- Sem abertura de telemarketing ("Bom dia, tudo bem?").
- **Sem menção de duração da reunião** ("20 minutos") — feedback explícito da mãe.
- Linha de fechamento **assertiva**, não pergunta.
- Horário de fechamento variado por lead (não idêntico).
- Pergunta diagnóstica estilo SPIN antes de propor fechamento.
- Objeção: reconhecer sem discordar → reforçar com fato específico → reoferecer
  dois horários concretos.
- Prova social só se for indicação real, nunca fabricada.

### Conflito direto encontrado
- **Script 9** ("Puxando para Call") do Arsenal usa "vale a gente sentar 20
  minutos" — bate de frente com a regra de não citar duração. Se algum desses
  scripts for adotado, essa menção precisa ser removida antes.

### Sem conflito, mas fora do escopo atual
- Scripts 28-29 (Indicação) são pós-venda com cliente ativo — CLAUDE.md's
  workflows são todos sobre lead frio (Fases 1-9), não existe um "workflow de
  cliente ativo" hoje. Fica anotado como ideia futura, não implementado agora.

## 3. Onde isso pode reforçar o Prospec.IA de verdade

### a) Workflow 3 (Follow-up) — falta um "breakup" explícito no 3º follow-up
Hoje o CLAUDE.md diz "3 follow-ups, depois RESTING" mas não prescreve o *tom*
do último. O Script 5 (D7 Breakup) do Arsenal é exatamente esse padrão —
tirar a pressão explicitamente ("esse é meu último recado... boa sorte com a
operação") em vez de insistir. Pesquisa e a lógica do próprio Arsenal dizem que
isso recupera ~20% das conversas que iam morrer silenciosamente.

**Proposta**: adicionar essa técnica como instrução explícita no System
message do Workflow 3 pro follow-up de nº 3 especificamente (os followups 1-2
continuam no padrão atual).

### b) Workflow 6 (Reativação) — os 3 scripts do Bloco 06 mapeiam quase 1:1
CLAUDE.md exige "não reutilizar a mesma sequência, gerar abordagem diferente".
Scripts 21-23 (Proposta Parada 30+, Lead que Disse "Mês que Vem", Ex-cliente)
são exemplos concretos de "motivo novo" que já respeitam essa regra.

**Proposta**: incorporar esses 3 padrões como exemplos no System message do
Workflow 6, pra IA ter referência concreta do que é "abordagem genuinamente
diferente" em vez de reinventar a cada vez.

### c) Workflow 4 (Handoff humano) — respostas de objeção prontas
Scripts 24-27 (caro/sem verba, vou pensar, já tentei, me manda por mensagem)
são templates de resposta a objeções específicas. Isso não substitui a
"sugestão de resposta" que a IA já gera no HUMAN_REVIEW, mas pode enriquecer o
prompt de sugestão quando a classificação for `OBJECTION`, dando à IA padrões
testados em vez de inventar do zero toda vez.

### d) Construtor de ICP — formalizar como dado estruturado por nicho
Hoje "a dor principal do nicho" parece estar embutida no prompt de forma solta.
A estrutura de 7 etapas do ICP (ramo, critérios de qualidade, sinais de
rejeição, porte, validação de mercado) é um formato mais rigoroso — poderia
virar um campo de configuração por campanha/nicho (fora do escopo de hoje,
citado como ideia pra quando houver uma segunda campanha rodando).

## 4. O que ficou incompleto (limitação técnica, não do conteúdo)

`objecoes.html`, `playbook.html` e o detalhamento de `diagnostico.html` são
wizards em JavaScript que só revelam o conteúdo real depois de cliques
(o scraper usado só lê o HTML/JS estático, não simula interação). Não inventei
conteúdo pra essas 3 — ficou marcado como "parcial" acima. Se quiser esse
conteúdo completo, a forma confiável é você mesmo navegar e printar/copiar as
telas, ou eu tento de novo com uma ferramenta que executa JavaScript.

## 5. Decisão e aplicação (2026-08-27/29)

Usuário aprovou os 3 itens (2a, 2b, 2c). Aplicados diretamente nos System
messages dos nodes de IA do workflow "Prospec" no n8n (via API REST, não
mexeu em `ai.js` — esse é um app manual/legado separado do fluxo automatizado
real):

- **`Gerar Follow-up com IA`**: a condição no prompt (texto do usuário) que
  antes tratava a 2ª e 3ª tentativa igual agora separa os dois casos — a 3ª
  tentativa (status `FOLLOW_UP_2`, a última antes de `RESTING`) ganhou
  instrução explícita de tom "breakup", baseada no Script 5 do Arsenal.
- **`Gerar Reativação com IA`**: acrescentado ao System message um bloco
  "PADRÕES DE REATIVAÇÃO QUE JÁ FUNCIONARAM" com os 3 padrões dos Scripts
  21-23 (motivo novo real, prazo prometido, ex-cliente), como referência de
  "ângulo genuinamente diferente" — sem copiar texto literal, servindo de guia
  de estrutura pra IA.
- **`Classificar Resposta com IA`**: acrescentado um bloco condicionando a
  sugestão de próxima mensagem por tipo de objeção quando `categoria=OBJECTION`,
  baseado nos Scripts 24-27 (tá caro/sem verba, vou pensar, já tentei antes, me
  manda por mensagem).

Nenhuma menção de duração foi introduzida (o Script 9, que tinha esse
conflito, não foi usado). `ai.js` não foi tocado — segue como estava.
