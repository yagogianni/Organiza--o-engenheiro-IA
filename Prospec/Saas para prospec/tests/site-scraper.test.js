import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { fetchSiteText } from '../src/services/site-scraper.js';

let server, baseUrl;

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <head><style>body { color: red; }</style><title>Clínica Sorriso Vida</title></head>
          <body>
            <script>console.log('should be stripped');</script>
            <h1>Clínica Sorriso Vida</h1>
            <p>Atendimento odontológico especializado &amp; humanizado.</p>
          </body>
        </html>
      `);
    } else if (req.url === '/json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    } else if (req.url === '/big') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body><p>${'palavra '.repeat(1000)}</p></body></html>`);
    } else if (req.url === '/error') {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<html><body>erro</body></html>');
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(resolve => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('fetchSiteText extracts visible text and strips scripts/styles/tags', async () => {
  const text = await fetchSiteText(`${baseUrl}/html`);
  assert.match(text, /Clínica Sorriso Vida/);
  assert.match(text, /Atendimento odontológico especializado & humanizado/);
  assert.doesNotMatch(text, /should be stripped/);
  assert.doesNotMatch(text, /color: red/);
  assert.doesNotMatch(text, /<[^>]+>/);
});

test('fetchSiteText returns null for an empty/missing url', async () => {
  assert.equal(await fetchSiteText(''), null);
  assert.equal(await fetchSiteText(undefined), null);
});

test('fetchSiteText returns null for non-HTML content types', async () => {
  const text = await fetchSiteText(`${baseUrl}/json`);
  assert.equal(text, null);
});

test('fetchSiteText returns null for non-2xx responses', async () => {
  const text = await fetchSiteText(`${baseUrl}/error`);
  assert.equal(text, null);
});

test('fetchSiteText returns null when the host is unreachable (never throws)', async () => {
  const text = await fetchSiteText('http://localhost:1');
  assert.equal(text, null);
});

test('fetchSiteText truncates very long pages', async () => {
  const text = await fetchSiteText(`${baseUrl}/big`);
  assert.ok(text.length <= 2000);
});
