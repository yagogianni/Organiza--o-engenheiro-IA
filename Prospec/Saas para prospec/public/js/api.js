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
