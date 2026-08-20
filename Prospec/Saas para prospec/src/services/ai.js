// src/services/ai.js - LLM Integration (Groq, OpenAI-compatible API)
import Groq from 'groq-sdk';
import { GROQ_API_KEY, GROQ_MODEL } from '../config.js';

let client;
function getClient() {
  if (!client) {
    client = new Groq({ apiKey: GROQ_API_KEY });
  }
  return client;
}

const ESTAGIOS_VALIDOS =
  'frio, curioso, interessado, qualificado, avaliando, com objeção, parado, em negociação, perto do fechamento, perdido';

// Adaptado do material de copywriting de Ícaro de Carvalho (Canvas de
// Persona, Checklist de USP, Os 4 Ps da Big Idea, Aulas de Copywriting),
// filtrado para prospecção B2B fria: mantém o raciocínio de nível de
// consciência, USP e antecipação de objeção; remove gatilhos agressivos
// de urgência/escassez que soam antiprofissionais em outbound B2B.
const METODOLOGIA = `
Metodologia de copywriting a seguir (adaptada para prospecção B2B fria):
- Primeiro identifique o nível de consciência do prospect (frio = nem percebe o problema; curioso/interessado = já percebe o problema ou já busca solução) e calibre a linguagem a isso.
- Baseie a dor/desejo na linguagem provável do cargo e segmento do prospect, nunca em descrição corporativa genérica.
- Escolha UMA dor ou desejo dominante e construa a mensagem inteira em torno dela — nunca empilhe vários benefícios.
- Diferencie feature de benefício: diga o que o resultado significa para o negócio/cargo dele, não o que o produto tecnicamente faz.
- Abra com um "pattern interrupt": uma observação específica e verossímil sobre a empresa/segmento dele — nunca uma saudação genérica ou autoapresentação longa.
- Quando fizer sentido, estruture o diferencial como USP: "Para [segmento/cargo específico] que [dor específica], [oferta] é a única que [resultado mensurável], porque [prova/mecanismo]".
- Antecipe a objeção mais provável e já a neutralize sutilmente na mensagem, em vez de esperar a resposta.
- Nunca use urgência falsa, escassez artificial ou gatilhos agressivos — decisores B2B percebem isso como antiprofissional.
- Evite ganchos emocionalmente agressivos (choque, sarcasmo, tom sombrio) — mantenha tom confiante, direto e profissionalmente calibrado.
- Mensagem curta, humana, natural, 2-4 parágrafos curtos, sem blocos gigantes, sem parecer template.
- Uma mensagem = um objetivo (um microcompromisso: resposta simples, uma pergunta, ou um convite de baixa fricção).
- CTA de baixa fricção (ex: "Posso te mostrar?", nunca "Vamos agendar uma reunião de 1 hora?").
`;

/**
 * Monta o prompt de análise inicial de um prospect
 */
export function buildAnalysisPrompt(data) {
  return `Você é um especialista em prospecção B2B e copywriting consultivo.

PROSPECT:
- Empresa: ${data.empresa}
- Segmento: ${data.segmento}
- Contato: ${data.contato}
- Cargo: ${data.cargo}
- Informações adicionais: ${data.info || 'Nenhuma'}
- Site: ${data.site || 'Não fornecido'}

Antes de gerar a mensagem, analise: estágio provável (${ESTAGIOS_VALIDOS}), quem é o interlocutor (decisor, gatekeeper, influenciador...) e qual o melhor ponto de entrada.
${METODOLOGIA}
Responda APENAS com um JSON válido, sem texto antes ou depois, no formato:
{
  "estagio": "escolha exatamente um destes valores: ${ESTAGIOS_VALIDOS}",
  "situacaoAtual": "análise breve da situação (2-3 linhas)",
  "objetivo": "objetivo desta primeira abordagem (1 frase)",
  "estrategia": "como abordar: tom, ponto de entrada, diferencial (2-3 linhas)",
  "oQueEvitar": "3-4 erros comuns a evitar, separados por quebra de linha",
  "mensagem": "mensagem pronta para copiar e enviar",
  "alternativa": "uma segunda variação da mensagem, com abordagem diferente"
}`;
}

/**
 * Monta o prompt de continuação de conversa, com histórico completo
 */
export function buildContinuePrompt(prospectContext, resposta) {
  const historico = (prospectContext.historico || [])
    .map(msg => `[${msg.tipo === 'outgoing' ? 'Você' : prospectContext.contato}] ${msg.conteudo}`)
    .join('\n\n');

  return `Você é um especialista em prospecção B2B e copywriting consultivo, continuando uma conversa já em andamento.

PROSPECT:
- Empresa: ${prospectContext.empresa}
- Segmento: ${prospectContext.segmento}
- Contato: ${prospectContext.contato}
- Cargo: ${prospectContext.cargo}

HISTÓRICO DA CONVERSA:
${historico || '(sem histórico anterior)'}

NOVA RESPOSTA RECEBIDA DO PROSPECT:
"${resposta}"

Analise em ordem: o que essa resposta significa, em que estágio do funil estamos agora (${ESTAGIOS_VALIDOS}), qual o objetivo da próxima interação, e qual estratégia seguir. Só depois disso, gere a próxima mensagem.
${METODOLOGIA}
Responda APENAS com um JSON válido, sem texto antes ou depois, no formato:
{
  "oQueSgnifica": "interpretação da resposta do prospect (2-3 linhas)",
  "estagioAtual": "escolha exatamente um destes valores: ${ESTAGIOS_VALIDOS}",
  "ondeEstamos": "estágio anterior → estágio atual",
  "objetivoAgora": "objetivo da próxima interação (1 frase)",
  "estrategiaAgora": "como proceder (2-3 linhas)",
  "oQueNaoFazer": "2-3 armadilhas a evitar agora, separadas por quebra de linha",
  "proximaMensagem": "próxima mensagem pronta para copiar e enviar",
  "timing": "quando enviar (ex: hoje, amanhã de manhã, esperar 2 dias)"
}`;
}

/**
 * Extrai e valida um JSON dentro do texto de resposta da IA
 */
export function parseJSONResponse(text, requiredKeys) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Formato de resposta inválido: nenhum JSON encontrado na resposta da IA');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const missing = requiredKeys.filter(key => !(key in parsed));
  if (missing.length > 0) {
    throw new Error(`Resposta da IA incompleta: faltam os campos ${missing.join(', ')}`);
  }
  return parsed;
}

/**
 * Chama a IA (Groq) para análise de novo prospect
 */
export async function analyzeNewProspect(prospectData) {
  const prompt = buildAnalysisPrompt(prospectData);
  const completion = await getClient().chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 2048,
    reasoning_effort: 'low',
    messages: [{ role: 'user', content: prompt }]
  });
  return parseJSONResponse(completion.choices[0].message.content, [
    'estagio', 'situacaoAtual', 'objetivo', 'estrategia', 'oQueEvitar', 'mensagem', 'alternativa'
  ]);
}

/**
 * Chama a IA (Groq) para análise de resposta do prospect + próxima estratégia
 */
export async function continueConversation(prospectContext, resposta) {
  const prompt = buildContinuePrompt(prospectContext, resposta);
  const completion = await getClient().chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 2048,
    reasoning_effort: 'low',
    messages: [{ role: 'user', content: prompt }]
  });
  return parseJSONResponse(completion.choices[0].message.content, [
    'oQueSgnifica', 'estagioAtual', 'ondeEstamos', 'objetivoAgora', 'estrategiaAgora',
    'oQueNaoFazer', 'proximaMensagem', 'timing'
  ]);
}
