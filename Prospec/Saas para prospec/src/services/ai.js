// src/services/ai.js - LLM Integration (Gemini)
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config.js';
import { computePipelineStage } from './pipeline.js';

let client;
function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return client;
}

const ESTAGIOS_VALIDOS =
  'frio, curioso, interessado, qualificado, avaliando, com objeção, parado, em negociação, perto do fechamento, perdido';

// Oferta real sendo prospectada (parceria Yago + mãe): tráfego pago e
// gestão de redes sociais (mãe) + landing pages e chatbots de atendimento
// (Yago), para negócios que precisam gerar e/ou converter mais leads. Sem
// nicho fixo — a dor escolhida deve vir sempre desse leque de geração/
// conversão de leads, nunca uma dor de negócio genérica e desconectada da
// oferta real.
const OFERTA = `
OFERTA QUE VOCÊ ESTÁ PROSPECTANDO:
Uma parceria que ajuda negócios a gerar e converter mais leads, combinando:
- Tráfego pago (Meta Ads / Google Ads)
- Gestão de redes sociais
- Landing pages de captura
- Chatbots de atendimento automatizado (responde e qualifica o lead na hora, sem perder venda por demora de resposta)

Público-alvo: qualquer negócio que precisa gerar e/ou converter mais leads — sem nicho fixo. A dor escolhida deve vir sempre desse leque (poucos leads chegando, leads que não convertem, demora no atendimento perdendo venda pra concorrência, dependência de indicação, tempo consumido gerenciando redes sociais sem sistema) — calibrada ao nicho/segmento do prospect quando fizer sentido, mas nunca inventando uma dor de negócio genérica desconectada dessa oferta.
`;

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
- Evite travessões (—) e outros maneirismos que denunciam texto gerado por IA; escreva como uma pessoa real digitando uma mensagem no WhatsApp, num tom mais profissional e natural, não robótico.
- Uma mensagem = um objetivo (um microcompromisso: resposta simples, uma pergunta, ou um convite de baixa fricção).
- CTA de baixa fricção (ex: "Posso te mostrar?", nunca "Vamos agendar uma reunião de 1 hora?").
- Nunca fabrique prova social ou números que não foram informados — prefira declarar especialização real a inventar estatística.
- Não abra a mensagem com "tudo bem?" — soa como telemarketing; vá direto ao ponto.
- Ao propor uma conversa ou reunião, ofereça sempre duas opções específicas de dia/horário, nunca um convite aberto — e nunca mencione duração (nada de "10 minutos", "15 min" etc.), só o dia e o horário.
- Ao fechar, afirme a disponibilidade como fato, não como pergunta (ex: "Tenho horário na Terça às 14h ou Quarta às 10h" em vez de "Terça às 14h ou Quarta às 10h funcionam melhor pra você?") — e peça pra pessoa confirmar qual horário fica melhor pra ela (ex: "Me avisa qual dia e horário funciona melhor pra você"). Nunca pergunte "faz sentido?" nem ofereça explicitamente a opção de recusar ("sem problema se não fizer sentido") — quem não tiver interesse vai dizer por conta própria; não convide essa objeção.
- Quando o prospect já respondeu demonstrando interesse, antes de propor fechamento, aprofunde com UMA pergunta que localize a dor real: primeiro entenda a situação atual dele, deixe a dor aparecer, mostre o custo de não resolver — só depois avance pro fechamento. Não pule direto pra marcar horário no primeiro sinal de interesse.
- Sempre que citar o motivo do contato, seja específico e verificável (algo que você observou sobre a empresa/perfil dele) — nunca "eu quero te apresentar meu serviço" como motivo.
- Ao lidar com objeção, siga: reconheça a objeção sem discordar → reforce o valor com um fato real e específico (nunca inventado) → reofereça os dois horários específicos.
- Se as informações do prospect mencionarem uma indicação real (alguém que já é cliente e o indicou), pode abrir citando essa indicação nominalmente — isso não é fabricar prova social, é uma conexão real.
`;

/**
 * Monta o prompt de análise inicial de um prospect
 */
export function buildAnalysisPrompt(data) {
  const siteBlock = data.siteContent
    ? `\nCONTEÚDO DO SITE (extraído automaticamente de ${data.site} — use para tornar a análise e a mensagem mais específicas, ex: serviços oferecidos, especialidades, tom de comunicação):\n"""\n${data.siteContent}\n"""\n`
    : '';

  return `Você é um especialista em prospecção B2B e copywriting consultivo.
${OFERTA}
PROSPECT:
- Empresa: ${data.empresa}
- Segmento: ${data.segmento}
- Contato: ${data.contato}
- Cargo: ${data.cargo}
- Informações adicionais: ${data.info || 'Nenhuma'}
- Site: ${data.site || 'Não fornecido'}
${siteBlock}
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

  const pipeline = computePipelineStage(prospectContext);
  const followUpNote = (pipeline.stage === 'em_followup' || pipeline.stage === 'sem_resposta')
    ? `\nCONTEXTO DE FOLLOW-UP: esta é a tentativa de contato nº ${pipeline.followUpCount + 1} sem resposta anterior registrada. Sugira ativamente trocar de canal de comunicação (ex: se as tentativas anteriores foram por Instagram, sugira WhatsApp, e-mail ou ligação) no campo "timing" ou na "proximaMensagem".\n`
    : '';

  return `Você é um especialista em prospecção B2B e copywriting consultivo, continuando uma conversa já em andamento.
${OFERTA}
PROSPECT:
- Empresa: ${prospectContext.empresa}
- Segmento: ${prospectContext.segmento}
- Contato: ${prospectContext.contato}
- Cargo: ${prospectContext.cargo}

HISTÓRICO DA CONVERSA:
${historico || '(sem histórico anterior)'}
${followUpNote}
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
 * Chama a IA (Gemini) para análise de novo prospect
 */
export async function analyzeNewProspect(prospectData) {
  const prompt = buildAnalysisPrompt(prospectData);
  const response = await getClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json', maxOutputTokens: 2048 }
  });
  return parseJSONResponse(response.text, [
    'estagio', 'situacaoAtual', 'objetivo', 'estrategia', 'oQueEvitar', 'mensagem', 'alternativa'
  ]);
}

/**
 * Chama a IA (Gemini) para análise de resposta do prospect + próxima estratégia
 */
export async function continueConversation(prospectContext, resposta) {
  const prompt = buildContinuePrompt(prospectContext, resposta);
  const response = await getClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json', maxOutputTokens: 2048 }
  });
  return parseJSONResponse(response.text, [
    'oQueSgnifica', 'estagioAtual', 'ondeEstamos', 'objetivoAgora', 'estrategiaAgora',
    'oQueNaoFazer', 'proximaMensagem', 'timing'
  ]);
}
