// src/utils/id-generator.js - Generate Unique IDs
import { v4 as uuidv4 } from 'uuid';

/**
 * Gera ID único para prospect
 * Formato: prosp_[uuid-curto]_[timestamp]
 */
export function generateProspectId() {
  const uuid = uuidv4().split('-')[0]; // Primeiros caracteres
  const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos timestamp
  return `prosp_${uuid}_${timestamp}`;
}

/**
 * Gera timestamp legível
 */
export function getFormattedTimestamp() {
  return new Date().toISOString();
}

/**
 * Gera data em formato legível
 */
export function getFormattedDate(date = new Date()) {
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
