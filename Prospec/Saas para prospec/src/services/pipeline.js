// src/services/pipeline.js - Pipeline stage computation (Método Sobral)

const STAGE_INFO = {
  abordado: {
    label: 'Abordado',
    tip: 'Primeira mensagem enviada. Aguarde alguns dias antes do 1º follow-up.'
  },
  em_followup: {
    label: 'Em Follow-up',
    tip: 'Envie o próximo follow-up — considere trocar de canal (ex: Instagram → WhatsApp).'
  },
  sem_resposta: {
    label: 'Sem Resposta',
    tip: '5+ follow-ups sem resposta é esperado no método — deixe descansar e tente reabordar mais adiante, ou peça indicação a outro contato.'
  },
  engajado: {
    label: 'Engajado',
    tip: 'Prospect respondeu! Continue a conversa e qualifique a necessidade.'
  },
  com_objecao: {
    label: 'Com Objeção',
    tip: 'Neutralize a objeção diretamente, sem ignorar.'
  },
  negociacao: {
    label: 'Em Negociação',
    tip: 'Foque em remover os últimos obstáculos e marcar o próximo passo concreto.'
  },
  parado: {
    label: 'Parado',
    tip: 'Crie uma razão legítima e específica para voltar a falar — evite follow-up genérico.'
  },
  perdido: {
    label: 'Perdido',
    tip: 'Recusou. Puxe o script de pedir indicação — uma recusa pode virar uma indicação.'
  }
};

function countOutgoingBeforeFirstReply(historico) {
  let count = 0;
  for (const msg of historico) {
    if (msg.tipo === 'incoming') break;
    if (msg.tipo === 'outgoing') count++;
  }
  return count;
}

function getLatestConversationalStage(analises) {
  if (!analises || analises.length === 0) return '';
  const last = analises[analises.length - 1];
  return (last.estagioAtual || last.estagio || '').toLowerCase().trim();
}

function bucketFromConversationalStage(stage) {
  if (stage === 'com objeção') return 'com_objecao';
  if (stage === 'em negociação' || stage === 'perto do fechamento') return 'negociacao';
  if (stage === 'parado') return 'parado';
  if (stage === 'perdido') return 'perdido';
  return 'engajado';
}

/**
 * Calcula o estágio do pipeline (método Sobral) a partir do histórico e
 * análises já salvos de um prospect — não depende de nenhum campo extra.
 */
export function computePipelineStage(prospect) {
  const historico = prospect.historico || [];
  const analises = prospect.analises || [];
  const hasIncoming = historico.some(msg => msg.tipo === 'incoming');
  const followUpCount = countOutgoingBeforeFirstReply(historico);

  let stage;
  if (!hasIncoming) {
    if (followUpCount <= 1) stage = 'abordado';
    else if (followUpCount <= 5) stage = 'em_followup';
    else stage = 'sem_resposta';
  } else {
    stage = bucketFromConversationalStage(getLatestConversationalStage(analises));
  }

  const info = STAGE_INFO[stage];
  const label = stage === 'em_followup' ? `${info.label} (${followUpCount}/5)` : info.label;

  return { stage, label, tip: info.tip, followUpCount };
}
