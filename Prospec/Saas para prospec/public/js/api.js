// public/js/api.js - API Communication Layer
// Status: FASE 1 - Implemented

const API_BASE = '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return body;
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error);
    throw error;
  }
}

/**
 * Analyze new prospect
 * POST /api/analyze
 */
export async function analyzeNewProspect(prospectData) {
  console.log('📡 Calling API: POST /api/analyze');
  return fetchAPI('/analyze', {
    method: 'POST',
    body: JSON.stringify(prospectData)
  });
}

/**
 * Continue conversation with prospect
 * POST /api/continue
 */
export async function continueConversation(data) {
  console.log('📡 Calling API: POST /api/continue');
  return fetchAPI('/continue', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Get all prospects
 * GET /api/prospects
 */
export async function getProspects() {
  console.log('📡 Calling API: GET /api/prospects');
  return fetchAPI('/prospects');
}

/**
 * Get specific prospect with history
 * GET /api/prospect/:id
 */
export async function getProspect(id) {
  console.log(`📡 Calling API: GET /api/prospect/${id}`);
  return fetchAPI(`/prospect/${id}`);
}

/**
 * Delete a prospect and its history
 * DELETE /api/prospect/:id
 */
export async function deleteProspect(id) {
  console.log(`📡 Calling API: DELETE /api/prospect/${id}`);
  return fetchAPI(`/prospect/${id}`, { method: 'DELETE' });
}

/**
 * Send a message for real (WhatsApp or e-mail) direct from the dashboard
 * POST /api/prospect/:id/send
 */
export async function sendMessageNow(id, mensagem, channel) {
  console.log(`📡 Calling API: POST /api/prospect/${id}/send`);
  return fetchAPI(`/prospect/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({ mensagem, channel })
  });
}

/**
 * Get the automatic lead-sourcing config (active niches, region, today's summary)
 * GET /api/sourcing-config
 */
export async function getSourcingConfig() {
  console.log('📡 Calling API: GET /api/sourcing-config');
  return fetchAPI('/sourcing-config');
}

/**
 * Save the automatic lead-sourcing config (active niches + region)
 * PUT /api/sourcing-config
 */
export async function saveSourcingConfig(data) {
  console.log('📡 Calling API: PUT /api/sourcing-config');
  return fetchAPI('/sourcing-config', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * Trigger an on-demand sourcing run (bypasses the daily schedule)
 * POST /api/sourcing-config/buscar-agora
 */
export async function buscarLeadsAgora() {
  console.log('📡 Calling API: POST /api/sourcing-config/buscar-agora');
  return fetchAPI('/sourcing-config/buscar-agora', { method: 'POST' });
}
