// src/services/storage.js - Supabase-backed persistence
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../config.js';

let client;
function getClient() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return client;
}

/**
 * No-op: as tabelas do Supabase já existem (criadas via migration). Mantido
 * para o startup de src/index.js não precisar mudar.
 */
export async function initializeDataDir() {
  // Intencionalmente vazio - o schema agora vive em migrations do Supabase.
}

/**
 * Lê todos os leads (índice resumido, sem histórico/análises)
 */
export async function getAllProspects() {
  const { data, error } = await getClient()
    .from('leads')
    .select('id, company_name, name, role, niche, status, automation_enabled, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  return data.map(lead => ({
    id: lead.id,
    empresa: lead.company_name,
    contato: lead.name,
    cargo: lead.role,
    segmento: lead.niche,
    status: lead.status,
    automationEnabled: lead.automation_enabled,
    dateCreated: lead.created_at
  }));
}

async function fetchHistoricoAndAnalises(leadId) {
  const client = getClient();

  const { data: messages, error: messagesError } = await client
    .from('messages')
    .select('created_at, direction, content')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (messagesError) throw new Error(messagesError.message);

  const { data: events, error: eventsError } = await client
    .from('automation_events')
    .select('created_at, event_type, payload')
    .eq('lead_id', leadId)
    .in('event_type', ['INITIAL_MESSAGE_SENT', 'ANALYSIS_GENERATED'])
    .order('created_at', { ascending: true });
  if (eventsError) throw new Error(eventsError.message);

  return {
    historico: messages.map(m => ({
      data: m.created_at,
      tipo: m.direction === 'OUTBOUND' ? 'outgoing' : 'incoming',
      conteudo: m.content
    })),
    analises: events.map(e => ({ date: e.created_at, ...e.payload }))
  };
}

/**
 * Lê todos os leads já enriquecidos com histórico e análises, para
 * permitir o cálculo do estágio do pipeline na camada de rotas
 */
export async function getAllProspectsWithPipeline() {
  const prospects = await getAllProspects();
  return Promise.all(prospects.map(async (p) => {
    const { historico, analises } = await fetchHistoricoAndAnalises(p.id);
    return { ...p, historico, analises };
  }));
}

/**
 * Lê um lead específico, combinando dados + histórico + análises
 */
export async function getProspect(id) {
  const { data: lead, error } = await getClient()
    .from('leads')
    .select('id, company_name, name, role, niche, website, notes, status, automation_enabled, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    if (error.code === '22P02') throw new Error('PROSPECT_NOT_FOUND');
    throw new Error(error.message);
  }
  if (!lead) throw new Error('PROSPECT_NOT_FOUND');

  const { historico, analises } = await fetchHistoricoAndAnalises(id);

  return {
    id: lead.id,
    empresa: lead.company_name,
    segmento: lead.niche,
    contato: lead.name,
    cargo: lead.role,
    info: lead.notes,
    site: lead.website,
    status: lead.status,
    automationEnabled: lead.automation_enabled,
    dateCreated: lead.created_at,
    historico,
    analises
  };
}

/**
 * Salva novo lead: cria o lead, a conversa, a primeira mensagem, e o
 * evento de auditoria da primeira análise
 */
export async function saveProspect(prospectData, analysis) {
  const client = getClient();

  const { data: lead, error: leadError } = await client
    .from('leads')
    .insert({
      name: prospectData.contato,
      company_name: prospectData.empresa,
      niche: prospectData.segmento,
      role: prospectData.cargo,
      notes: prospectData.info || null,
      website: prospectData.site || null,
      source: 'manual',
      status: 'WAITING_RESPONSE'
    })
    .select('id, company_name, name, role, niche, website, notes, status, automation_enabled, created_at')
    .single();
  if (leadError) throw new Error(leadError.message);

  const { data: conversation, error: convError } = await client
    .from('conversations')
    .insert({ lead_id: lead.id, channel: 'manual', status: 'OPEN' })
    .select('id')
    .single();
  if (convError) throw new Error(convError.message);

  const { error: messageError } = await client
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      lead_id: lead.id,
      direction: 'OUTBOUND',
      content: analysis.mensagem,
      channel: 'manual'
    });
  if (messageError) throw new Error(messageError.message);

  const { error: eventError } = await client
    .from('automation_events')
    .insert({ lead_id: lead.id, event_type: 'INITIAL_MESSAGE_SENT', payload: analysis });
  if (eventError) throw new Error(eventError.message);

  return {
    id: lead.id,
    empresa: lead.company_name,
    segmento: lead.niche,
    contato: lead.name,
    cargo: lead.role,
    info: lead.notes,
    site: lead.website,
    status: lead.status,
    automationEnabled: lead.automation_enabled,
    dateCreated: lead.created_at
  };
}

/**
 * Registra a resposta recebida do lead, a próxima mensagem enviada, e
 * a análise correspondente
 */
export async function addToHistory(id, resposta, analise) {
  const client = getClient();

  const { data: lead, error: leadError } = await client
    .from('leads')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (leadError) {
    if (leadError.code === '22P02') throw new Error('PROSPECT_NOT_FOUND');
    throw new Error(leadError.message);
  }
  if (!lead) throw new Error('PROSPECT_NOT_FOUND');

  const { data: conversation, error: convError } = await client
    .from('conversations')
    .select('id')
    .eq('lead_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (convError) throw new Error(convError.message);

  const { error: incomingError } = await client
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      lead_id: id,
      direction: 'INBOUND',
      content: resposta,
      channel: 'manual'
    });
  if (incomingError) throw new Error(incomingError.message);

  const { error: responseEventError } = await client
    .from('automation_events')
    .insert({ lead_id: id, event_type: 'RESPONSE_RECEIVED', payload: { content: resposta } });
  if (responseEventError) throw new Error(responseEventError.message);

  if (analise.proximaMensagem) {
    const { error: outgoingError } = await client
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        lead_id: id,
        direction: 'OUTBOUND',
        content: analise.proximaMensagem,
        channel: 'manual'
      });
    if (outgoingError) throw new Error(outgoingError.message);
  }

  const { error: analysisEventError } = await client
    .from('automation_events')
    .insert({ lead_id: id, event_type: 'ANALYSIS_GENERATED', payload: analise });
  if (analysisEventError) throw new Error(analysisEventError.message);
}
