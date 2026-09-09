// src/services/sender.js - Envio real de mensagens (WhatsApp via Evolution
// API), pra uso da tela de conversa do dashboard. Mesmo serviço que o n8n
// usa - isso permite mandar uma mensagem de verdade direto do Prospec.IA,
// sem precisar copiar e colar manualmente no WhatsApp.
import {
  EVOLUTION_API_URL,
  EVOLUTION_API_KEY,
  EVOLUTION_INSTANCE
} from '../config.js';

/**
 * Normaliza telefone pra dígitos puros com DDI 55 (mesma regra do storage.js)
 */
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    return '55' + digits;
  }
  return digits;
}

/**
 * Manda uma mensagem de WhatsApp de verdade via Evolution API.
 * Lança erro se a chamada falhar - quem chamar decide o que fazer
 * (não marca sent_at até isso retornar com sucesso).
 */
export async function sendWhatsAppMessage(phone, text) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    throw new Error('Evolution API não configurada (EVOLUTION_API_URL/EVOLUTION_API_KEY/EVOLUTION_INSTANCE ausentes no .env)');
  }
  const number = normalizePhone(phone);
  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
    body: JSON.stringify({ number, text, delay: 1500 })
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Evolution API retornou ${response.status}: ${body.slice(0, 300)}`);
  }
  return JSON.parse(body);
}
