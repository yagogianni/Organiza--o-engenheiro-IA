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
 * Normaliza telefone pra dígitos puros com DDI, pra bater com o formato
 * usado no JID do WhatsApp (usado pelo Workflow 4 pra reconhecer respostas
 * de leads existentes via sufixo dos últimos 8 dígitos)
 */
function normalizePhone(raw) {
  if (!raw) return raw;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    return '55' + digits;
  }
  return digits;
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
    .select('id, company_name, name, role, niche, website, notes, status, automation_enabled, created_at, phone, email')
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
    telefone: lead.phone,
    email: lead.email,
    historico,
    analises
  };
}

/**
 * Registra uma mensagem que JÁ foi enviada de verdade (WhatsApp/Evolution API
 * ou E-mail/Brevo) - diferente do outgoing gerado por addToHistory, que fica
 * pendente de envio manual. sent_at é preenchido com o momento real do envio.
 */
export async function recordSentMessage(id, texto, channel) {
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
    .maybeSingle();
  if (convError) throw new Error(convError.message);

  let conversationId = conversation?.id;
  if (!conversationId) {
    const { data: newConv, error: newConvError } = await client
      .from('conversations')
      .insert({ lead_id: id, channel, status: 'OPEN' })
      .select('id')
      .single();
    if (newConvError) throw new Error(newConvError.message);
    conversationId = newConv.id;
  }

  const { error: messageError } = await client
    .from('messages')
    .insert({
      conversation_id: conversationId,
      lead_id: id,
      direction: 'OUTBOUND',
      content: texto,
      channel,
      sent_at: new Date().toISOString()
    });
  if (messageError) throw new Error(messageError.message);
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
      phone: normalizePhone(prospectData.telefone),
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
 * Apaga um lead e todo o histórico relacionado (mensagens, conversas,
 * eventos) - usado quando um lead não faz mais parte da prospecção
 */
export async function deleteProspect(id) {
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

  const { error: eventsError } = await client.from('automation_events').delete().eq('lead_id', id);
  if (eventsError) throw new Error(eventsError.message);

  const { error: messagesError } = await client.from('messages').delete().eq('lead_id', id);
  if (messagesError) throw new Error(messagesError.message);

  const { error: conversationsError } = await client.from('conversations').delete().eq('lead_id', id);
  if (conversationsError) throw new Error(conversationsError.message);

  const { error: deleteLeadError } = await client.from('leads').delete().eq('id', id);
  if (deleteLeadError) throw new Error(deleteLeadError.message);
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
    // sent_at já vem preenchido de propósito: esta mensagem é uma sugestão
    // pra revisão humana (tela "Continuar Conversa"), não deve nunca ser
    // pega pelo Motor de Envio (que varre messages com sent_at=null) -
    // quem manda essa mensagem de verdade é a pessoa, copiando manualmente.
    const { error: outgoingError } = await client
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        lead_id: id,
        direction: 'OUTBOUND',
        content: analise.proximaMensagem,
        channel: 'manual',
        sent_at: new Date().toISOString()
      });
    if (outgoingError) throw new Error(outgoingError.message);
  }

  const { error: analysisEventError } = await client
    .from('automation_events')
    .insert({ lead_id: id, event_type: 'ANALYSIS_GENERATED', payload: analise });
  if (analysisEventError) throw new Error(analysisEventError.message);
}

/**
 * Lê a configuração da prospecção automática (nichos ativos + região) e um
 * resumo de hoje (nicho da vez + quantos leads sourced entraram hoje).
 * Se a configuração nunca foi salva, retorna nichos/região vazios - quem
 * chama decide o que fazer (o dashboard mostra a lista vazia pro usuário
 * preencher pela primeira vez).
 */
export async function getSourcingConfig() {
  const client = getClient();

  const { data: settings, error: settingsError } = await client
    .from('sourcing_settings')
    .select('active_niches, target_region, last_niche_index, last_run_at, last_run_status, last_run_message')
    .eq('id', 'default')
    .maybeSingle();
  if (settingsError) throw new Error(settingsError.message);

  const niches = settings?.active_niches || [];
  const region = settings?.target_region || '';
  const lastNicheIndex = settings?.last_niche_index ?? -1;
  const nicheToday = lastNicheIndex >= 0 && niches[lastNicheIndex] ? niches[lastNicheIndex] : null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { count, error: countError } = await client
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'openstreetmap')
    .gte('created_at', startOfToday.toISOString());
  if (countError) throw new Error(countError.message);

  return {
    niches,
    region,
    nicheToday,
    leadsToday: count || 0,
    dailyCap: 10,
    lastRunAt: settings?.last_run_at || null,
    lastRunStatus: settings?.last_run_status || null,
    lastRunMessage: settings?.last_run_message || null
  };
}

/**
 * Confere se o texto de região vira mesmo uma cidade/região no OpenStreetMap
 * (não um endereço específico, escritório, etc.) - usa o mesmo geocodificador
 * (Nominatim) que o fluxo de busca do n8n usa de verdade, pra pegar o erro
 * na hora de salvar em vez de a busca falhar calada dias depois. Lança erro
 * descritivo (mostrando o que foi encontrado) se não parecer uma região de
 * verdade; retorna o nome completo resolvido se parecer.
 */
async function resolveRegion(region) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(region)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'ProspecIA-Sourcing/1.0 (contato: yago.gianni@gmail.com)' } }
  );
  const results = await res.json();
  const place = results[0];
  if (!place) {
    throw new Error(`Não encontrei nenhum lugar pra "${region}". Tente algo como "Itajaí, SC, Brasil".`);
  }
  if (place.class !== 'boundary' || place.type !== 'administrative') {
    throw new Error(
      `"${region}" não parece ser uma cidade/região - encontrei "${place.display_name}" (isso é um ${place.type}, não uma cidade). ` +
      'Tente escrever só o nome da cidade/região, sem misturar o nicho no mesmo texto, tipo "Itajaí, SC, Brasil".'
    );
  }
  return place.display_name;
}

/**
 * Salva a configuração da prospecção automática (nichos ativos + região).
 * Não toca em last_niche_index de propósito - esse campo é controlado só
 * pelo fluxo de busca do n8n, pra saber qual nicho buscar no próximo dia.
 */
export async function saveSourcingConfig({ niches, region }) {
  if (!Array.isArray(niches) || niches.length === 0 || niches.some(n => typeof n !== 'string' || !n.trim())) {
    throw new Error('Nichos deve ser uma lista de textos não vazios');
  }
  if (typeof region !== 'string' || !region.trim()) {
    throw new Error('Região é obrigatória');
  }

  const resolvedRegion = await resolveRegion(region.trim());

  const client = getClient();
  const { data, error } = await client
    .from('sourcing_settings')
    .upsert({ id: 'default', active_niches: niches, target_region: region.trim(), updated_at: new Date().toISOString() })
    .select('active_niches, target_region')
    .single();
  if (error) throw new Error(error.message);

  return { niches: data.active_niches, region: data.target_region, resolvedRegion };
}
