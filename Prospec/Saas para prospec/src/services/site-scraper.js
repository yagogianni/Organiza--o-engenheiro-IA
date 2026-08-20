// src/services/site-scraper.js - Best-effort site text extraction (no external deps/keys)

const FETCH_TIMEOUT_MS = 5000;
const MAX_CHARS = 2000;

function normalizeUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function extractVisibleText(html) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ');
  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  return decoded.replace(/\s+/g, ' ').trim();
}

/**
 * Busca e extrai o texto visível de um site, best-effort. Nunca lança erro
 * — retorna null se a URL for inválida, o site não responder/demorar, ou o
 * conteúdo não for HTML, para nunca travar a análise por causa do site.
 */
export async function fetchSiteText(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProspecAI/1.0)' }
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/html')) {
      return null;
    }

    const html = await response.text();
    const text = extractVisibleText(html);
    return text ? text.slice(0, MAX_CHARS) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
