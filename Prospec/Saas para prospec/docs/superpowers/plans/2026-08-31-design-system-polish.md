# Dashboard Design-System Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Prospec.IA dashboard a systematic token layer (type, spacing, radius, elevation, motion), fix four leftover hardcoded-color/font bugs, add a small inline-SVG icon set, replace the stubbed toast notifications with a real component, and normalize interface microcopy — without touching the approved beige/sage-green palette, AI-generated message content, or adding charts/animation choreography.

**Architecture:** Pure frontend, vanilla JS/CSS, no build step, no new runtime dependencies. Two new small ES modules (`public/js/icons.js`, `public/js/toast.js`) follow the existing pattern of `public/js/storage-local.js`/`api.js`/`ui.js`. CSS changes are additive (new tokens in `theme.css`) then consumed by a mechanical, section-by-section rewrite of `style.css`. `index.html` and `app.js` get small, targeted edits to wire icons and the toast container in.

**Tech Stack:** Vanilla JS (ES modules), CSS custom properties, `node --test` for the one pure-logic module (`icons.js`), Playwright CLI (via `npx`, no new dependency) for visual smoke checks.

**Spec:** [docs/superpowers/specs/2026-08-31-design-system-polish-design.md](../specs/2026-08-31-design-system-polish-design.md)

## Global Constraints

- No palette changes — beige/sage-green (light) and ink/sage-green (dark) values in `theme.css` stay exactly as they are; only new non-color tokens are added.
- No changes to AI-generated analysis/message content (`src/services/ai.js` and anything it returns) — out of scope.
- No new npm dependencies — icons are hand-written inline SVG, toasts are vanilla DOM, Playwright is invoked via `npx` (cached, not installed).
- Every user-facing string touched must end up in Portuguese, in the same tone already used elsewhere in the app (direct, no jargon, matches existing copy like "Nenhum prospect ainda. Crie um novo na aba anterior.").
- Follow the existing code style: `tests/*.test.js` at repo root using `node:test` + `node:assert/strict` (see `tests/utils.test.js` for the exact convention), ES module `import`/`export` throughout, JSDoc-style `/** ... */` comments above exported functions (see `public/js/api.js`).

---

## Task 1: Design tokens

**Files:**
- Modify: `public/css/theme.css`

**Interfaces:**
- Produces: CSS custom properties `--text-xs/sm/base/md/lg/xl/2xl`, `--space-1/2/3/4/5/6/8`, `--radius-sm/md/lg/xl/pill`, `--shadow-sm/md`, `--ease-out`, `--duration-fast/base` — available globally from `:root`, with `--shadow-sm`/`--shadow-md` overridden inside the existing `[data-theme="dark"]` block. Every later task consumes these by name.

- [ ] **Step 1: Add the token block to `theme.css`**

Insert immediately after the closing `}` of the existing `:root { ... }` block (the one ending at the `--border-color` line, before the `/* ===== DARK MODE ... */` comment):

```css
/* ===== DESIGN TOKENS — type, spacing, radius, elevation, motion ===== */
/* Not themed (same in light/dark) except --shadow-*, overridden below. */
:root {
  /* Type scale (1.25 ratio, base 16px) */
  --text-xs: 0.75rem;    /* 12px — meta, timestamps, badges */
  --text-sm: 0.85rem;    /* 13.6px — secondary text, labels */
  --text-base: 1rem;     /* 16px — body */
  --text-md: 1.1rem;     /* 17.6px — section headers (h3) */
  --text-lg: 1.3rem;     /* 20.8px — panel headers (h2) */
  --text-xl: 1.6rem;     /* 25.6px — page title */
  --text-2xl: 2rem;      /* 32px — reserved, unused today */

  /* Spacing scale, base 4px */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.5rem;   /* 24px */
  --space-6: 2rem;     /* 32px */
  --space-8: 3rem;     /* 48px */

  /* Radius scale */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-pill: 999px;

  /* Elevation */
  --shadow-sm: 0 1px 3px rgba(43, 42, 34, 0.08);
  --shadow-md: 0 4px 12px rgba(43, 42, 34, 0.12);

  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
}
```

- [ ] **Step 2: Add the dark-mode shadow override**

Inside the existing `[data-theme="dark"] { ... }` block, immediately after its opening `{` (before `/* Primary Colors */`), add:

```css
  /* Elevation (darker shadows read correctly on the ink background) */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.25);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.35);

```

- [ ] **Step 3: Verify the file is still valid and nothing else changed**

Run:
```bash
grep -c "^:root" "public/css/theme.css"
```
Expected: `2` (the original color block + the new token block — both are valid, additive `:root` rule sets; CSS allows multiple `:root` blocks).

Run:
```bash
grep -c "shadow-sm" "public/css/theme.css"
```
Expected: `2` (defined once in `:root`, overridden once in `[data-theme="dark"]`).

- [ ] **Step 4: Commit**

```bash
git add public/css/theme.css
git commit -m "feat: add design tokens (type, spacing, radius, elevation, motion)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Icon system

**Files:**
- Create: `public/js/icons.js`
- Test: `tests/icons.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function icon(name: string): string` — returns an inline `<svg class="icon" ...>` markup string for one of `'copy' | 'send' | 'trash' | 'search' | 'sun' | 'moon' | 'check' | 'x'`; throws `Error` with message starting `Ícone desconhecido` for any other name. Tasks 6 and 7 import `icon` from this file.

- [ ] **Step 1: Write the failing tests**

Create `tests/icons.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icon } from '../public/js/icons.js';

test('icon() returns inline SVG markup for every known name', () => {
  const names = ['copy', 'send', 'trash', 'search', 'sun', 'moon', 'check', 'x'];
  for (const name of names) {
    const svg = icon(name);
    assert.match(svg, /^<svg /, `icon('${name}') should start with <svg`);
    assert.match(svg, /class="icon"/, `icon('${name}') should carry the icon class`);
    assert.match(svg, /<\/svg>$/, `icon('${name}') should be a closed <svg> element`);
  }
});

test('icon() uses currentColor so it inherits the surrounding text color', () => {
  assert.match(icon('trash'), /stroke="currentColor"/);
});

test('icon() throws for an unknown icon name', () => {
  assert.throws(() => icon('does-not-exist'), /Ícone desconhecido/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/icons.test.js`
Expected: FAIL — `Cannot find module '../public/js/icons.js'` (the file doesn't exist yet).

- [ ] **Step 3: Implement `public/js/icons.js`**

```javascript
// public/js/icons.js - Inline SVG icon helpers
// Small, dependency-free icon set for dashboard actions. Every icon shares
// an 18x18 viewBox, thin stroke, and no fill, so it scales and recolors
// with the surrounding text via the shared `.icon` CSS class (width/height:
// 1em, defined in style.css).

const ICON_PATHS = {
  copy: '<path d="M6 6V3.5C6 3.22 6.22 3 6.5 3H13.5C13.78 3 14 3.22 14 3.5V10.5C14 10.78 13.78 11 13.5 11H11"/><rect x="4" y="7" width="8" height="8" rx="1"/>',
  send: '<path d="M15 3L2 8.5L7.5 10.5M15 3L9.5 15L7.5 10.5M15 3L7.5 10.5"/>',
  trash: '<path d="M4 5H14M7 5V3.5C7 3.22 7.22 3 7.5 3H10.5C10.78 3 11 3.22 11 3.5V5M6 5V14C6 14.55 6.45 15 7 15H11C11.55 15 12 14.55 12 14V5"/>',
  search: '<circle cx="7.5" cy="7.5" r="4.5"/><path d="M11 11L15 15"/>',
  sun: '<circle cx="9" cy="9" r="3.5"/><path d="M9 2V3.5M9 14.5V16M2 9H3.5M14.5 9H16M4.2 4.2L5.2 5.2M12.8 12.8L13.8 13.8M4.2 13.8L5.2 12.8M12.8 5.2L13.8 4.2"/>',
  moon: '<path d="M15 10.2C13.9 10.7 12.7 11 11.4 11C7.1 11 3.6 7.5 3.6 3.2C3.6 2.9 3.6 2.6 3.7 2.3C2 3.7 1 5.8 1 8.1C1 12.4 4.5 15.9 8.8 15.9C11.5 15.9 13.9 14.5 15.2 12.4C15.1 11.7 15 11 15 10.2Z"/>',
  check: '<path d="M4 9L7.5 12.5L14 5"/>',
  x: '<path d="M5 5L13 13M13 5L5 13"/>'
};

/**
 * Returns inline <svg> markup for the named icon.
 * Usage: `container.innerHTML = icon('trash') + 'Excluir'`
 * @param {string} name one of the keys in ICON_PATHS
 * @returns {string}
 */
export function icon(name) {
  const paths = ICON_PATHS[name];
  if (!paths) {
    throw new Error(`Ícone desconhecido: "${name}"`);
  }
  return `<svg class="icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test tests/icons.test.js`
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add public/js/icons.js tests/icons.test.js
git commit -m "feat: add inline SVG icon set (copy, send, trash, search, sun, moon, check, x)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Component pass, part 1 — header, tabs, layout, panels, forms, buttons, stage badge

**Files:**
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: tokens from Task 1 (`--text-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-out`).
- Produces: `.icon` utility class (`width/height: 1em`) that Task 6/7 rely on for sizing every icon.

- [ ] **Step 1: Add the `.icon` utility class**

Immediately after the `* { margin: 0; padding: 0; box-sizing: border-box; }` reset block, add:

```css
/* Shared icon sizing — every icon from public/js/icons.js gets this class */
.icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: -0.125em;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Replace the header block**

Find:
```css
.header {
  background-color: var(--header-bg);
  padding: 2rem 2rem;
  text-align: center;
  border-bottom: 2px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header h1 {
  font-size: 2rem;
  color: var(--primary-color);
  flex: 1;
  min-width: 200px;
}

.header .subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0.5rem 0 0;
  flex: 1;
}

.header-controls {
  display: flex;
  gap: 1rem;
}

.btn-icon {
  background: none;
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-icon:hover {
  background-color: var(--hover-bg);
}
```

Replace with:
```css
.header {
  background-color: var(--header-bg);
  padding: var(--space-6) var(--space-6);
  text-align: center;
  border-bottom: 2px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.header h1 {
  font-size: var(--text-xl);
  color: var(--primary-color);
  flex: 1;
  min-width: 200px;
}

.header .subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: var(--space-2) 0 0;
  flex: 1;
}

.header-controls {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.btn-icon {
  background: none;
  border: 1px solid var(--border-color);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-primary);
  font-size: var(--text-sm);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  transition: background-color var(--duration-base) var(--ease-out);
}

.btn-icon:hover {
  background-color: var(--hover-bg);
}
```

(`--text-xl` is 1.6rem, intentionally smaller than the old bare `2rem` — it read oversized next to the wordmark lockup added in the last redesign.)

- [ ] **Step 3: Replace the tabs block**

Find:
```css
.tabs {
  display: flex;
  gap: 6px;
  padding: 6px;
  margin: 0 2rem 1.5rem;
  background-color: var(--secondary-bg);
  border-radius: 12px;
  width: fit-content;
}

.tab-btn {
  padding: 0.6rem 1.1rem;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  background-color: var(--primary-color);
  color: var(--bg-primary);
}

@media (max-width: 768px) {
  .tabs {
    margin: 0 1rem 1rem;
  }
}
```

Replace with:
```css
.tabs {
  display: flex;
  gap: 6px;
  padding: 6px;
  margin: 0 var(--space-6) var(--space-5);
  background-color: var(--secondary-bg);
  border-radius: var(--radius-xl);
  width: fit-content;
}

.tab-btn {
  padding: var(--space-3) var(--space-4);
  background: none;
  border: none;
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-base);
  font-weight: 600;
  transition: background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  background-color: var(--primary-color);
  color: var(--bg-primary);
}

@media (max-width: 768px) {
  .tabs {
    margin: 0 var(--space-4) var(--space-4);
  }
}
```

(The 6px gap/padding is finer than the smallest spacing token, `--space-1` = 4px; kept as a literal since neither scale value fits without visibly changing the tab pill's proportions.)

- [ ] **Step 4: Replace content/layout spacing**

Find:
```css
.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}
```
Replace with:
```css
.content {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
}
```

Find:
```css
.layout-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  height: 100%;
}

@media (max-width: 1024px) {
  .layout-2col {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
```
Replace with:
```css
.layout-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  height: 100%;
}

@media (max-width: 1024px) {
  .layout-2col {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }
}
```

- [ ] **Step 5: Replace the panel block**

Find:
```css
.panel {
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.panel h2 {
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-size: 1.3rem;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.panel h3 {
  color: var(--text-primary);
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}
```
Replace with:
```css
.panel {
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
}

.panel h2 {
  margin-bottom: var(--space-5);
  color: var(--text-primary);
  font-size: var(--text-lg);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: var(--space-2);
}

.panel h3 {
  color: var(--text-primary);
  margin-top: var(--space-5);
  margin-bottom: var(--space-2);
  font-size: var(--text-md);
}
```

(`box-shadow` now uses `--shadow-sm`, which is also overridden for dark mode — previously the shadow was the same flat `rgba(0,0,0,0.1)` regardless of theme, too faint to read on the dark ink background.)

- [ ] **Step 6: Replace the forms block (fixes the blue focus-ring bug)**

Find:
```css
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```
Replace with:
```css
.form-group {
  margin-bottom: var(--space-5);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-base);
  transition: border-color var(--duration-base) var(--ease-out);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-color-light);
}
```

- [ ] **Step 7: Replace the buttons block (fixes both hardcoded-shadow bugs)**

Find:
```css
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-color-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-success {
  background-color: var(--success-color);
  color: white;
}

.btn-success:hover {
  background-color: var(--success-color-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: white;
}

.btn-secondary:hover {
  background-color: var(--secondary-color-hover);
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.button-group .btn {
  flex: 1;
  min-width: 150px;
}
```
Replace with:
```css
.btn {
  padding: var(--space-3) var(--space-5);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  cursor: pointer;
  transition: background-color var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-color-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-success {
  background-color: var(--success-color);
  color: white;
}

.btn-success:hover {
  background-color: var(--success-color-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: white;
}

.btn-secondary:hover {
  background-color: var(--secondary-color-hover);
}

.button-group {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
  flex-wrap: wrap;
}

.button-group .btn {
  flex: 1;
  min-width: 150px;
}
```

(`display: inline-flex` on `.btn` is new — needed so the send/copy icons Task 6 adds sit inline with the button label instead of stacking; with no icon present yet it has zero visual effect.)

- [ ] **Step 8: Replace the stage-badge sizing (colors untouched)**

Find:
```css
.stage-badge {
  display: inline-block;
  margin-bottom: 1.5rem;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  background-color: var(--primary-color-light);
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
}
```
Replace with:
```css
.stage-badge {
  display: inline-block;
  margin-bottom: var(--space-5);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  background-color: var(--primary-color-light);
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: capitalize;
}
```

- [ ] **Step 9: Verify the bugs are gone and the file still parses**

Run:
```bash
grep -n "59, 130, 246\|34, 197, 94\|rgba(0, 0, 0, 0.1)" public/css/style.css
```
Expected: no output (all three hardcoded leftovers removed).

Run:
```bash
node -e "require('fs').readFileSync('public/css/style.css','utf8')" && echo "readable"
```
Expected: `readable` (sanity check the file exists and isn't corrupted; CSS has no Node-side parser here, so this is just an I/O check — the real check is the visual pass in Task 9).

- [ ] **Step 10: Commit**

```bash
git add public/css/style.css
git commit -m "fix: apply design tokens to header/tabs/layout/panels/forms/buttons, kill hardcoded blue shadows

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Component pass, part 2 — painel table, priority row, analysis sections, message box

**Files:**
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: tokens from Task 1.

- [ ] **Step 1: Replace the painel-subtitle and table block**

Find:
```css
.panel-subtitle {
  color: var(--text-secondary, #666);
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.painel-table {
  width: 100%;
  overflow-x: auto;
}

.painel-table table {
  width: 100%;
  border-collapse: collapse;
}

.painel-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--border-color, #ddd);
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--text-secondary, #666);
}

.painel-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #eee);
  vertical-align: top;
}

.painel-row {
  cursor: pointer;
}

.painel-row:hover {
  background-color: var(--secondary-bg);
}

.painel-row--priority {
  background-color: var(--warning-bg);
}

.painel-row--priority:hover {
  background-color: var(--warning-bg);
  filter: brightness(0.95);
}
```
Replace with:
```css
.panel-subtitle {
  color: var(--text-secondary);
  margin-top: calc(var(--space-2) * -1);
  margin-bottom: var(--space-5);
  font-size: var(--text-sm);
}

.painel-table {
  width: 100%;
  overflow-x: auto;
}

.painel-table table {
  width: 100%;
  border-collapse: collapse;
}

.painel-table th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  border-bottom: 2px solid var(--border-color);
  font-size: var(--text-sm);
  text-transform: uppercase;
  color: var(--text-secondary);
}

.painel-table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-color);
  vertical-align: top;
}

.painel-row {
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.painel-row:hover {
  background-color: var(--secondary-bg);
}

.painel-row--priority {
  border-left: 3px solid var(--warning-color);
}

.painel-row--priority:hover {
  background-color: var(--hover-bg);
}
```

(This is the priority-row hierarchy fix from the spec: a left-border accent instead of a full-row background tint, matching the same accent pattern already used on `.analysis-section`/`.conversation-message`. The `--warning-bg` full-tint made the row compete visually with its own `.status-badge--priority` badge; the badge is now the one clear signal, the border just anchors it to the row.)

- [ ] **Step 2: Replace status-badge and delete-button sizing**

Find:
```css
.status-badge {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background-color: var(--primary-color-light);
  color: var(--primary-color);
  white-space: nowrap;
}

.status-badge--priority {
  background-color: var(--warning-color);
  color: var(--panel-bg);
}

.status-badge--resting,
.status-badge--closed {
  background-color: var(--warning-bg);
  color: var(--warning-color);
}

.painel-tip {
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
}

.btn-delete-lead {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  opacity: 0.6;
}

.btn-delete-lead:hover {
  opacity: 1;
  background-color: var(--error-bg);
}
```
Replace with:
```css
.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 600;
  background-color: var(--primary-color-light);
  color: var(--primary-color);
  white-space: nowrap;
}

.status-badge--priority {
  background-color: var(--warning-color);
  color: var(--panel-bg);
}

.status-badge--resting,
.status-badge--closed {
  background-color: var(--warning-bg);
  color: var(--warning-color);
}

.painel-tip {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.btn-delete-lead {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-base);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  opacity: 0.6;
  display: inline-flex;
  align-items: center;
  transition: opacity var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out);
}

.btn-delete-lead:hover {
  opacity: 1;
  background-color: var(--error-bg);
}
```

(`display: inline-flex; align-items: center;` added to `.btn-delete-lead` because Task 6 replaces its 🗑️ emoji with an SVG icon, which needs flex centering the emoji glyph didn't.)

- [ ] **Step 3: Replace analysis-section and message-box (fixes the Courier New font bug)**

Find:
```css
.analysis-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--secondary-bg);
  border-left: 4px solid var(--primary-color);
  border-radius: 4px;
}

.analysis-section.warning {
  border-left-color: var(--warning-color);
  background-color: var(--warning-bg);
}

.analysis-section.message {
  border-left-color: var(--success-color);
  background-color: var(--success-bg);
}

.analysis-section h3 {
  margin-top: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.analysis-section p {
  line-height: 1.6;
  color: var(--text-primary);
  margin: 0.5rem 0;
}

.message-box {
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-family: 'Courier New', monospace;
  min-height: 100px;
}
```
Replace with:
```css
.analysis-section {
  margin-bottom: var(--space-6);
  padding: var(--space-5);
  background-color: var(--secondary-bg);
  border-left: 4px solid var(--primary-color);
  border-radius: var(--radius-sm);
}

.analysis-section.warning {
  border-left-color: var(--warning-color);
  background-color: var(--warning-bg);
}

.analysis-section.message {
  border-left-color: var(--success-color);
  background-color: var(--success-bg);
}

.analysis-section h3 {
  margin-top: 0;
  color: var(--text-primary);
  font-size: var(--text-md);
}

.analysis-section p {
  line-height: 1.6;
  color: var(--text-primary);
  margin: var(--space-2) 0;
}

.message-box {
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin: var(--space-4) 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  min-height: 100px;
}
```

- [ ] **Step 4: Replace loading-spinner, error-message, empty-message spacing**

Find:
```css
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}
```
Replace with:
```css
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.spinner {
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-4);
}
```

Find:
```css
.error-message {
  padding: 1rem;
  background-color: var(--error-bg);
  border-left: 4px solid var(--error-color);
  color: var(--error-color);
  border-radius: 4px;
  margin-bottom: 1rem;
}

.empty-message {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}
```
Replace with:
```css
.error-message {
  padding: var(--space-4);
  background-color: var(--error-bg);
  border-left: 4px solid var(--error-color);
  color: var(--error-color);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-4);
}

.empty-message {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-secondary);
}
```

- [ ] **Step 5: Verify**

Run:
```bash
grep -n "Courier New\|999px\|0.3rem 0.8rem" public/css/style.css
```
Expected: no output.

Run:
```bash
grep -c "warning-color)" public/css/style.css
```
Expected: at least `2` (the new `.painel-row--priority` border plus the existing badge/section rules) — confirms the priority-row edit landed.

- [ ] **Step 6: Commit**

```bash
git add public/css/style.css
git commit -m "fix: token pass over painel table, priority row hierarchy, analysis sections, message-box font

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Component pass, part 3 — prospects list, search field, conversation, footer, responsive cleanup

**Files:**
- Modify: `public/css/style.css`
- Modify: `public/index.html`

**Interfaces:**
- Produces: `.search-wrapper` / `.search-icon` classes and a wrapped `#searchProspect` input in `index.html`, which Task 6 populates with the search icon via JS.

- [ ] **Step 1: Replace prospects-list-panel, filter-group, search/filter inputs**

Find:
```css
.prospects-list-panel {
  overflow-y: auto;
  max-height: 70vh;
}

.filter-group {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-input,
.filter-select {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.95rem;
}
```
Replace with:
```css
.prospects-list-panel {
  overflow-y: auto;
  max-height: 70vh;
}

.filter-group {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.search-input,
.filter-select {
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: var(--text-base);
}

.filter-select {
  flex: 1;
}

.search-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-wrapper .search-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--text-secondary);
  display: flex;
  pointer-events: none;
}

.search-wrapper .search-input {
  width: 100%;
  padding-left: calc(var(--space-3) * 2 + 1em);
}
```

(`.search-input, .filter-select` lost the shared `flex: 1` — `.filter-select` keeps it directly, `.search-input`'s parent `.search-wrapper` takes it over instead, since the input now sits inside a positioning wrapper for the icon.)

- [ ] **Step 2: Wrap the search input in `index.html`**

Find (inside the `#continuar-conversa` section's `.filter-group`):
```html
            <div class="filter-group">
              <input type="text" id="searchProspect" placeholder="Buscar prospect..."
                     class="search-input">
              <select id="filterStatus" class="filter-select">
```
Replace with:
```html
            <div class="filter-group">
              <div class="search-wrapper">
                <span class="search-icon" id="searchIcon"></span>
                <input type="text" id="searchProspect" placeholder="Buscar prospect..."
                       class="search-input">
              </div>
              <select id="filterStatus" class="filter-select">
```

- [ ] **Step 3: Replace prospects-list and prospect-item block**

Find:
```css
.prospects-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.prospect-item {
  padding: 1rem;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.prospect-item:hover {
  background-color: var(--hover-bg);
  border-color: var(--primary-color);
  transform: translateX(4px);
}

.prospect-item.active {
  border-color: var(--primary-color);
  background-color: var(--primary-color);
  color: white;
}

.prospect-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.prospect-item-header .stage-badge {
  margin-bottom: 0;
  white-space: nowrap;
}

.prospect-item-company {
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.pipeline-tip {
  display: none;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background-color: var(--secondary-bg);
  border-left: 4px solid var(--primary-color);
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.prospect-item-info {
  font-size: 0.85rem;
  opacity: 0.8;
}
```
Replace with:
```css
.prospects-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.prospect-item {
  padding: var(--space-4);
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--duration-base) var(--ease-out), border-color var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out);
}

.prospect-item:hover {
  background-color: var(--hover-bg);
  border-color: var(--primary-color);
  transform: translateX(4px);
}

.prospect-item.active {
  border-color: var(--primary-color);
  background-color: var(--primary-color);
  color: white;
}

.prospect-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.prospect-item-header .stage-badge {
  margin-bottom: 0;
  white-space: nowrap;
}

.prospect-item-company {
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.pipeline-tip {
  display: none;
  margin-bottom: var(--space-5);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background-color: var(--secondary-bg);
  border-left: 4px solid var(--primary-color);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.prospect-item-info {
  font-size: var(--text-sm);
  opacity: 0.8;
}
```

- [ ] **Step 4: Replace conversation block**

Find:
```css
.conversation-panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 70vh;
}

.prospect-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.prospect-header h3 {
  margin-top: 0;
  color: var(--primary-color);
}

.prospect-header p {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0.5rem 0;
}

.conversation-history {
  flex: 1;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--secondary-bg);
  border-radius: 6px;
  overflow-y: auto;
}

.conversation-message {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: var(--input-bg);
  border-radius: 6px;
  border-left: 3px solid var(--border-color);
}

.conversation-message.outgoing {
  border-left-color: var(--primary-color);
  background-color: var(--primary-color);
  color: white;
}

.conversation-message.incoming {
  border-left-color: var(--success-color);
}

.conversation-message-date {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 0.3rem;
}

.conversation-message-text {
  line-height: 1.5;
  word-break: break-word;
}

.new-response-section {
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.new-response-section h3 {
  margin-top: 0;
  font-size: 1rem;
}

.new-response-section textarea {
  width: 100%;
  margin: 1rem 0;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  resize: vertical;
}
```
Replace with:
```css
.conversation-panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 70vh;
}

.prospect-header {
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.prospect-header h3 {
  margin-top: 0;
  color: var(--primary-color);
}

.prospect-header p {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: var(--space-2) 0;
}

.conversation-history {
  flex: 1;
  margin-bottom: var(--space-5);
  padding: var(--space-4);
  background-color: var(--secondary-bg);
  border-radius: var(--radius-md);
  overflow-y: auto;
}

.conversation-message {
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background-color: var(--input-bg);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--border-color);
}

.conversation-message.outgoing {
  border-left-color: var(--primary-color);
  background-color: var(--primary-color);
  color: white;
}

.conversation-message.incoming {
  border-left-color: var(--success-color);
}

.conversation-message-date {
  font-size: var(--text-xs);
  opacity: 0.7;
  margin-bottom: var(--space-1);
}

.conversation-message-text {
  line-height: 1.5;
  word-break: break-word;
}

.new-response-section {
  margin-top: auto;
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-color);
}

.new-response-section h3 {
  margin-top: 0;
  font-size: var(--text-base);
}

.new-response-section textarea {
  width: 100%;
  margin: var(--space-4) 0;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  resize: vertical;
}
```

- [ ] **Step 5: Replace footer and responsive block**

Find:
```css
.footer {
  background-color: var(--header-bg);
  padding: 1.5rem;
  text-align: center;
  border-top: 2px solid var(--border-color);
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.footer p {
  margin: 0.3rem 0;
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    padding: 1rem;
  }

  .header h1 {
    font-size: 1.5rem;
  }

  .content {
    padding: 1rem;
  }

  .tabs {
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 0 1 auto;
    padding: 0.75rem 1rem;
  }

  .panel {
    padding: 1rem;
  }

  .panel h2 {
    font-size: 1.1rem;
  }
}
```
Replace with:
```css
.footer {
  background-color: var(--header-bg);
  padding: var(--space-5);
  text-align: center;
  border-top: 2px solid var(--border-color);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.footer p {
  margin: var(--space-1) 0;
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    padding: var(--space-4);
  }

  .header h1 {
    font-size: var(--text-lg);
  }

  .content {
    padding: var(--space-4);
  }

  .tabs {
    flex-wrap: wrap;
  }

  .panel {
    padding: var(--space-4);
  }

  .panel h2 {
    font-size: var(--text-md);
  }
}
```

(Dropped the mobile-only `.tab-btn { padding: 0.75rem 1rem; }` override — after Task 3's Step 3, the desktop `.tab-btn` padding is already `var(--space-3) var(--space-4)` = `0.75rem 1rem`, so the mobile override became a no-op duplicate. `.header h1` mobile size moves from the old `1.5rem` to `var(--text-lg)` (1.3rem) — closest token that still reads clearly smaller than the new desktop `--text-xl` (1.6rem), preserving the original "shrinks on mobile" intent.)

- [ ] **Step 6: Verify**

Run:
```bash
grep -n "0.75rem 1rem" public/css/style.css
```
Expected: no output (the dead mobile override is gone; the one live occurrence became a token in Task 3).

Run:
```bash
grep -c "search-wrapper" public/css/style.css public/index.html
```
Expected: both files show at least `1`.

- [ ] **Step 7: Commit**

```bash
git add public/css/style.css public/index.html
git commit -m "fix: token pass over prospects list/conversation/footer, wrap search input for icon

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Wire icons into the dashboard

**Files:**
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `icon(name)` from `public/js/icons.js` (Task 2); `.icon`, `.search-icon` classes (Tasks 3/5).

- [ ] **Step 1: Import `icon` and add the static-icon initializer**

In `public/js/app.js`, find the import line:
```javascript
import { analyzeNewProspect, continueConversation, getProspects, getProspect, deleteProspect, sendMessageNow } from './api.js';
import { getTheme, saveTheme } from './storage-local.js';
```
Replace with:
```javascript
import { analyzeNewProspect, continueConversation, getProspects, getProspect, deleteProspect, sendMessageNow } from './api.js';
import { getTheme, saveTheme } from './storage-local.js';
import { icon } from './icons.js';
```

Find the end of `initializeEventListeners` (its closing lines):
```javascript
  // Continue conversation
  const btnAnalyzarContinuar = document.getElementById('btnAnalyzarContinuar');
  if (btnAnalyzarContinuar) {
    btnAnalyzarContinuar.addEventListener('click', handleContinueConversation);
  }

  console.log('✅ Event listeners initialized');
}
```
Replace with:
```javascript
  // Continue conversation
  const btnAnalyzarContinuar = document.getElementById('btnAnalyzarContinuar');
  if (btnAnalyzarContinuar) {
    btnAnalyzarContinuar.addEventListener('click', handleContinueConversation);
  }

  initializeStaticIcons();

  console.log('✅ Event listeners initialized');
}

/**
 * Insert icons into the buttons/fields that are already in index.html and
 * never re-rendered (the ones app.js builds dynamically - the delete button
 * in renderPainel, the theme toggle - get their icon at render time instead).
 */
function initializeStaticIcons() {
  const staticIcons = {
    btnCopiarMensagem: 'copy',
    btnCopiarAlternativa: 'copy',
    btnCopiarProximaMensagem: 'copy',
    btnEnviarAgora: 'send',
    searchIcon: 'search'
  };

  Object.entries(staticIcons).forEach(([elementId, iconName]) => {
    const el = document.getElementById(elementId);
    if (el) el.insertAdjacentHTML('afterbegin', icon(iconName));
  });
}
```

- [ ] **Step 2: Add the icon to the theme toggle**

Find:
```javascript
/**
 * Update theme button text
 */
function updateThemeButton(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? 'Claro' : 'Escuro';
  }
}
```
Replace with:
```javascript
/**
 * Update theme button icon + text
 */
function updateThemeButton(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const label = theme === 'dark' ? 'Claro' : 'Escuro';
    const iconName = theme === 'dark' ? 'sun' : 'moon';
    btn.innerHTML = `${icon(iconName)}<span>${label}</span>`;
  }
}
```

- [ ] **Step 3: Replace the 🗑️ emoji in the delete button**

Find (inside `renderPainel`):
```javascript
        <td><button class="btn-delete-lead" data-id="${p.id}" data-empresa="${p.empresa}" title="Excluir lead">🗑️</button></td>
```
Replace with:
```javascript
        <td><button class="btn-delete-lead" data-id="${p.id}" data-empresa="${p.empresa}" title="Excluir lead">${icon('trash')}</button></td>
```

- [ ] **Step 4: Verify**

Run:
```bash
grep -n "🗑️" public/js/app.js
```
Expected: no output.

Run:
```bash
grep -c "icon(" public/js/app.js
```
Expected: `3` — one `icon(iconName)` call inside the `initializeStaticIcons` loop (drives all 5 static buttons/fields from one call site), one `icon(iconName)` in `updateThemeButton`, one `icon('trash')` in `renderPainel`. (The `import { icon } from './icons.js';` line doesn't count — it has no `icon(`.)

Start the app and confirm no import errors:
```bash
npm start &
sleep 2
curl -s -o /dev/null -w "HTTP:%{http_code}\n" http://localhost:3000/js/icons.js
curl -s -o /dev/null -w "HTTP:%{http_code}\n" http://localhost:3000/js/app.js
kill %1
```
Expected: both `HTTP:200`.

- [ ] **Step 5: Commit**

```bash
git add public/js/app.js
git commit -m "feat: wire icon set into copy/send/search/theme-toggle/delete controls

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Toast notifications

**Files:**
- Create: `public/js/toast.js`
- Modify: `public/css/style.css`
- Modify: `public/index.html`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `icon(name)` from `public/js/icons.js`.
- Produces: `export function showToast(message: string, type?: 'success' | 'error'): void`.

- [ ] **Step 1: Add the toast container to `index.html`**

Find the closing of `</footer>` and `</div>` (end of `.container`):
```html
    <footer class="footer">
      <p>Prospec.IA — Fluxo Digital SC</p>
      <p>Dados salvos localmente</p>
    </footer>
  </div>
```
Replace with:
```html
    <footer class="footer">
      <p>Prospec.IA — Fluxo Digital SC</p>
      <p>Dados salvos localmente</p>
    </footer>
  </div>

  <div id="toastContainer" aria-live="polite"></div>
```

- [ ] **Step 2: Add toast CSS**

Append to the end of `public/css/style.css`:
```css
/* Toast notifications */
#toastContainer {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  z-index: 1000;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 240px;
  max-width: 360px;
  padding: var(--space-3) var(--space-4);
  background-color: var(--panel-bg);
  border-left: 3px solid var(--success-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
  pointer-events: auto;
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out);
}

.toast--visible {
  opacity: 1;
  transform: translateY(0);
}

.toast--error {
  border-left-color: var(--error-color);
}

.toast .icon {
  color: var(--success-color);
}

.toast--error .icon {
  color: var(--error-color);
}
```

- [ ] **Step 3: Implement `public/js/toast.js`**

```javascript
// public/js/toast.js - Toast notification component
// Shows a brief, dismissible confirmation after an action (copy/send/delete).
// Replaces the previous showNotification(), which only did console.log and
// never showed the user anything.

import { icon } from './icons.js';

const AUTO_DISMISS_MS = 3500;

/**
 * Show a toast notification in the fixed #toastContainer.
 * @param {string} message
 * @param {'success'|'error'} [type='success']
 */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.warn('showToast: #toastContainer não encontrado no DOM');
    return;
  }

  const isError = type === 'error';
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' toast--error' : ''}`;
  toast.innerHTML = `${icon(isError ? 'x' : 'check')}<span>${message}</span>`;
  container.appendChild(toast);

  // Add the visible class on the next frame so the opacity/transform
  // transition actually runs instead of starting already-visible.
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  const dismiss = () => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  toast.addEventListener('click', dismiss);
  setTimeout(dismiss, AUTO_DISMISS_MS);
}
```

- [ ] **Step 4: Swap `showNotification()` for `showToast()` in `app.js`**

Find the import line (already modified in Task 6 - append to it):
```javascript
import { icon } from './icons.js';
```
Replace with:
```javascript
import { icon } from './icons.js';
import { showToast } from './toast.js';
```

Find:
```javascript
/**
 * Show notification
 */
function showNotification(message, type = 'success') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // TODO: Implement toast notifications in Fase 2
}
```
Delete this function entirely (it's replaced by the imported `showToast`).

Find every call site and rename `showNotification(` to `showToast(`:
```javascript
    showNotification('Copiado para a área de transferência.');
```
```javascript
    showNotification('Erro ao copiar', 'error');
```
```javascript
    showNotification(`"${empresaNome}" excluído.`, 'success');
```
```javascript
    showNotification('Erro ao excluir o lead.', 'error');
```
Replace each `showNotification(` with `showToast(` (four call sites total, same arguments).

- [ ] **Step 5: Verify**

Run:
```bash
grep -n "showNotification" public/js/app.js
```
Expected: no output (fully replaced).

Run:
```bash
grep -c "showToast" public/js/app.js
```
Expected: `5` — the `import { showToast } from './toast.js';` line plus the four call sites (the function itself now lives in `toast.js`, not `app.js`).

Start the app and confirm both new modules load:
```bash
npm start &
sleep 2
curl -s -o /dev/null -w "HTTP:%{http_code}\n" http://localhost:3000/js/toast.js
kill %1
```
Expected: `HTTP:200`.

- [ ] **Step 6: Commit**

```bash
git add public/js/toast.js public/js/app.js public/css/style.css public/index.html
git commit -m "feat: replace stubbed showNotification with real toast component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Microcopy pass — normalize punctuation on user-facing strings

**Files:**
- Modify: `public/js/app.js`

**Interfaces:**
- None (string literal changes only).

- [ ] **Step 1: Fix inconsistent trailing punctuation**

The audit (checked every string passed to `showToast`/`showError`/`confirm` in `app.js`) found these inconsistencies: two call sites say the exact same sentence ("Selecione um prospect primeiro") with and without a trailing period, and `'Erro ao copiar'` / `'Nenhuma conversa ainda'` / `'Por favor, insira a resposta do prospect'` are missing the period every other message in the file ends with. Apply these four exact changes:

Find (in `handleContinueConversation`):
```javascript
    showError('continueAnalysisResult', 'Por favor, insira a resposta do prospect');
    return;
  }

  // TODO: Get prospect ID from selected item
  const prospectId = getSelectedProspectId();
  if (!prospectId) {
    showError('continueAnalysisResult', 'Selecione um prospect primeiro');
```
Replace with:
```javascript
    showError('continueAnalysisResult', 'Por favor, insira a resposta do prospect.');
    return;
  }

  // TODO: Get prospect ID from selected item
  const prospectId = getSelectedProspectId();
  if (!prospectId) {
    showError('continueAnalysisResult', 'Selecione um prospect primeiro.');
```

Find (in `copyToClipboard`):
```javascript
  }).catch(err => {
    console.error('Erro ao copiar:', err);
    showToast('Erro ao copiar', 'error');
  });
```
Replace with:
```javascript
  }).catch(err => {
    console.error('Erro ao copiar:', err);
    showToast('Erro ao copiar.', 'error');
  });
```

Find (in `displayConversationDetail`):
```javascript
  } else {
    history.innerHTML = '<p class="empty-message">Nenhuma conversa ainda</p>';
  }
```
Replace with:
```javascript
  } else {
    history.innerHTML = '<p class="empty-message">Nenhuma conversa ainda.</p>';
  }
```

- [ ] **Step 2: Verify every remaining user-facing message ends consistently**

Run:
```bash
grep -oE "(showToast|showError)\('[^']*'" public/js/app.js
```

Expected output — every quoted string ends in `.` except ones that end in `:` before interpolation (those are intentionally incomplete literals continued by a template expression, e.g. `Erro: ${error.message}`, which is a separate, already-existing pattern, not touched by this task):
```
showError('resultPanel', `Erro
showError('continueAnalysisResult', 'Por favor, insira a resposta do prospect.'
showError('continueAnalysisResult', 'Selecione um prospect primeiro.'
showError('continueAnalysisResult', `Erro
showToast('Copiado para a área de transferência.'
showToast('Erro ao copiar.'
showToast(`"${empresaNome}" excluído.`
showToast('Erro ao excluir o lead.'
```
(Exact grep output will also include the two `handleSendNow`/`handleDeleteLead` template-literal messages, already correctly punctuated — confirm nothing without a period is left besides the two intentional interpolated `Erro: ${...}` cases.)

- [ ] **Step 3: Commit**

```bash
git add public/js/app.js
git commit -m "fix: normalize trailing punctuation across user-facing toast/error messages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Final verification

**Files:**
- None modified (verification only).

- [ ] **Step 1: Run the full backend test suite (regression check — this pass touched no backend code, but confirm nothing broke)**

Run: `npm test`
Expected: all existing suites (`tests/*.test.js`, including the new `tests/icons.test.js`) pass, 0 failures.

- [ ] **Step 2: Full-repo grep sweep for every bug this plan targeted**

Run:
```bash
grep -rn "59, 130, 246\|34, 197, 94\|Courier New\|🗑️" public/
```
Expected: no output.

Run:
```bash
grep -n "TODO: Implement toast notifications" public/js/app.js
```
Expected: no output (stub comment is gone along with the function).

- [ ] **Step 3: Automated light-mode screenshot (default landing tab)**

Run:
```bash
npm start &
sleep 2
npx --yes playwright screenshot http://localhost:3000 /tmp/prospec-nova-prospec-light.png --viewport-size=1400,900
kill %1
```
Expected: PNG written, no errors. Open it (or describe it) and confirm: beige background, sage-green primary buttons/header title, Space Grotesk on headings, no layout overflow, search icon and button icons visible where expected on this tab (the header theme toggle and its icon are visible; the copy/send icons live on tab 2, not captured by this single shot).

- [ ] **Step 4: Manual QA checklist (needs real interaction — tabs and dark mode are client-side JS state, not separate URLs, so the CLI screenshot above can't drive them)**

Open `http://localhost:3000` in a real browser and confirm all of the following. This is the plan's actual coverage of Tasks 3-8's visual/interactive result, per the spec's explicit choice not to build an automated visual-regression harness for a 2-person internal tool:

- [ ] Toggle dark mode: header, panels, and shadows all switch correctly; the sun/moon icon in the theme toggle updates.
- [ ] "Nova Prospecção" tab: form still submits, analysis panel renders, copy/alternativa buttons show the copy icon and work.
- [ ] "Pipeline" tab: search field shows the magnifying-glass icon inset in the input, search/filter still work; select a lead, confirm "Enviar agora" shows the send icon; click "Copiar mensagem" and confirm a toast appears bottom-right, auto-dismisses after ~3.5s, and dismisses immediately on click.
- [ ] "Todos os Leads" tab: a `HUMAN_REVIEW` lead (if one exists) shows the left-border accent instead of a full tinted row; delete-lead button shows the trash icon; deleting a lead shows a toast and the row disappears.
- [ ] No console errors in the browser devtools on any of the three tabs.

- [ ] **Step 5: Stop the dev server if still running, confirm working tree is clean**

Run:
```bash
git status --short
```
Expected: empty (everything from Tasks 1-8 already committed).

- [ ] **Step 6: Update the roadmap memory**

This step is for whoever executes the plan to hand back to the user — not a code change. Report to the user: which of the 6 spec goals are done, the exact commits (`git log --oneline -9`), and that this closes sub-project 2 of 4 from the 2026-08-31 brainstorm (analytics/charts, prospecting copywriting, and animation/microinteractions remain, each needing its own brainstorm before planning).
