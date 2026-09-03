// src/services/sender.js - Envio real de mensagens (WhatsApp via Evolution API,
// E-mail via Brevo SMTP), pra uso da tela de conversa do dashboard. Mesmos
// serviços que o n8n usa - isso permite mandar uma mensagem de verdade direto
// do Prospec.IA, sem precisar copiar e colar manualmente no WhatsApp/Gmail.
import nodemailer from 'nodemailer';
import {
  EVOLUTION_API_URL,
  EVOLUTION_API_KEY,
  EVOLUTION_INSTANCE,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_LOGIN,
  SMTP_KEY,
  SMTP_FROM
} from '../config.js';

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // porta 587 usa STARTTLS, não SSL implícito
      auth: { user: SMTP_LOGIN, pass: SMTP_KEY }
    });
  }
  return transporter;
}

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

/**
 * Manda um e-mail de verdade via Brevo SMTP.
 */
export async function sendEmailMessage(to, subject, text) {
  if (!SMTP_HOST || !SMTP_LOGIN || !SMTP_KEY) {
    throw new Error('SMTP não configurado (SMTP_HOST/SMTP_LOGIN/SMTP_KEY ausentes no .env)');
  }
  if (!to) {
    throw new Error('Lead não tem e-mail cadastrado');
  }
  return getTransporter().sendMail({ from: SMTP_FROM, to, subject, text });
}
