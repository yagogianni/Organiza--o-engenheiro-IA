// src/services/analysis.js - Business Logic for Analysis
// Status: FASE 1 - A implementar

/**
 * Extrai estágio do prospect baseado em contexto
 * (Fase 2: Lógica mais inteligente)
 */
export function determineStage(prospectData, history = []) {
  // TODO: Implementar em Fase 2
  // Por enquanto: sempre "Frio"
  return 'Frio';
}

/**
 * Determina nível de interesse
 * (Fase 2: Análise de padrões)
 */
export function determineInterestLevel(prospectData, history = []) {
  // TODO: Implementar em Fase 2
  // Por enquanto: sempre "Médio"
  return 'Médio';
}

/**
 * Detecta objeções na resposta do prospect
 * (Fase 2: NLP básico)
 */
export function detectObjections(resposta) {
  // TODO: Implementar em Fase 2
  const objecoes = [];

  // Keywords simples para detectar objeções
  if (resposta.toLowerCase().includes('preço') ||
      resposta.toLowerCase().includes('caro')) {
    objecoes.push('Objeção de Preço');
  }

  if (resposta.toLowerCase().includes('agora não') ||
      resposta.toLowerCase().includes('depois') ||
      resposta.toLowerCase().includes('timing')) {
    objecoes.push('Objeção de Timing');
  }

  if (resposta.toLowerCase().includes('já temos') ||
      resposta.toLowerCase().includes('já usando')) {
    objecoes.push('Solução Alternativa Existente');
  }

  return objecoes;
}

/**
 * Recomenda timing para próximo contato
 * (Fase 2: Mais sofisticado)
 */
export function recommendTiming(stage, interestLevel, lastContactDate) {
  // TODO: Implementar em Fase 2
  // Por enquanto: hoje
  return 'Hoje';
}
