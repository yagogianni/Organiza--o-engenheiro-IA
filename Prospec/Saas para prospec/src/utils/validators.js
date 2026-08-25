// src/utils/validators.js - Input Validation
// Status: FASE 1 - A implementar

/**
 * Valida dados da nova prospecção
 */
export function validateNewProspect(data) {
  const errors = [];

  if (!data.empresa || data.empresa.trim() === '') {
    errors.push('Empresa é obrigatória');
  }

  if (!data.contato || data.contato.trim() === '') {
    errors.push('Contato é obrigatório');
  }

  if (!data.cargo || data.cargo.trim() === '') {
    errors.push('Cargo é obrigatório');
  }

  if (!data.telefone || data.telefone.trim() === '') {
    errors.push('Telefone é obrigatório');
  }

  if (!data.segmento || data.segmento.trim() === '') {
    errors.push('Segmento é obrigatório');
  }

  if (errors.length > 0) {
    throw new Error(`Validação falhou: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Valida resposta do prospect
 */
export function validateContinueInput(data) {
  const errors = [];

  if (!data.id || data.id.trim() === '') {
    errors.push('ID do prospect é obrigatório');
  }

  if (!data.resposta || data.resposta.trim() === '') {
    errors.push('Resposta do prospect é obrigatória');
  }

  if (errors.length > 0) {
    throw new Error(`Validação falhou: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Sanitiza strings de entrada
 */
export function sanitizeString(str) {
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove tags HTML
    .slice(0, 1000); // Máximo 1000 caracteres
}
