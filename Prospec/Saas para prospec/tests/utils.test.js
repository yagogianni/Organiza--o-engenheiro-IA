import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateProspectId, getFormattedTimestamp } from '../src/utils/id-generator.js';
import { validateNewProspect, validateContinueInput, sanitizeString } from '../src/utils/validators.js';

test('generateProspectId returns a prosp_<id>_<digits> string', () => {
  const id = generateProspectId();
  assert.match(id, /^prosp_[a-f0-9]+_\d{1,6}$/);
});

test('generateProspectId returns unique ids across calls', () => {
  const a = generateProspectId();
  const b = generateProspectId();
  assert.notEqual(a, b);
});

test('getFormattedTimestamp returns a valid ISO string', () => {
  const ts = getFormattedTimestamp();
  assert.equal(new Date(ts).toISOString(), ts);
});

test('validateNewProspect accepts a complete payload', () => {
  assert.equal(
    validateNewProspect({ empresa: 'Acme', contato: 'Joao', cargo: 'CEO', segmento: 'SaaS' }),
    true
  );
});

test('validateNewProspect rejects missing empresa', () => {
  assert.throws(
    () => validateNewProspect({ contato: 'Joao', cargo: 'CEO', segmento: 'SaaS' }),
    /Empresa é obrigatória/
  );
});

test('validateContinueInput rejects missing resposta', () => {
  assert.throws(
    () => validateContinueInput({ id: 'prosp_x' }),
    /Resposta do prospect é obrigatória/
  );
});

test('sanitizeString strips angle brackets and trims length', () => {
  const result = sanitizeString('  <script>alert(1)</script>  ');
  assert.equal(result.includes('<'), false);
  assert.equal(result.includes('>'), false);
});
