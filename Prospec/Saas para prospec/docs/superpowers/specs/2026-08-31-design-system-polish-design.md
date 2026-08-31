# Design system polish — Prospec.IA dashboard

Date: 2026-08-31
Status: Approved by user, ready for implementation plan

## Context

The dashboard was redesigned in the prior session (2026-08-29/30): palette
moved from generic blue/dark to a beige/sage-green identity for Fluxo
Digital SC (`public/css/theme.css`), typography set to Space Grotesk /
IBM Plex Sans / IBM Plex Mono, and emoji were stripped from user-facing
copy in HTML. That pass established the identity but did not touch
`public/css/style.css` systematically — component styles still use ad-hoc
values left over from before the redesign, and no design tokens exist
beyond color.

This spec is the first of four sub-projects for elevating the dashboard,
scoped from a broader request to apply design-skill methodology (from
`jakubkrehel/skills` — `better-ui`, `better-typography`, `better-colors`,
`better-layout`, `better-writing`, `better-accessibility` — plus
`Owl-Listener/designer-skills` and `emilkowalski/skills` for motion
restraint). The other three sub-projects (analytics/charts, prospecting
copywriting, animation/microinteractions) are out of scope here and will
each get their own brainstorm.

### Concrete problems found in the current code

- `public/css/style.css:220` — form focus box-shadow hardcoded to
  `rgba(59, 130, 246, 0.1)` (old blue theme), inconsistent with the
  approved green palette.
- `public/css/style.css:242` — `.btn-primary:hover` shadow hardcoded to
  `rgba(59, 130, 246, 0.3)` (blue), same leftover bug.
- `public/css/style.css:253` — `.btn-success:hover` shadow hardcoded to
  `rgba(34, 197, 94, 0.3)` (a different, unrelated green), not tied to
  `--success-color`.
- `public/css/style.css:446` — `.message-box` uses `'Courier New', monospace`
  instead of the IBM Plex Mono already standardized for
  `.stage-badge/.status-badge/.mono`.
- No spacing, type, radius, elevation, or motion scale — values are ad hoc
  rem/px throughout (`2rem`, `1.3rem`, `1.1rem`, `0.95rem`, `0.85rem` for
  type; `4px/6px/8px/12px/999px` for radius).
- `.painel-row--priority` tints the entire table row with `--warning-bg`,
  which reads as heavy/muddy next to the row's own status badge — poor
  optical hierarchy for the one thing the table most needs to surface
  (leads needing a human).
- `showNotification()` in `public/js/app.js:612` is a stub — `console.log`
  only, comment says "TODO: Implement toast notifications in Fase 2".
  Every copy/delete action silently fires a no-op: the user gets no visual
  confirmation today.
- Delete-lead button uses a raw 🗑️ emoji (`public/js/app.js:192`),
  inconsistent with the emoji-free copy everywhere else.
- No icon system at all — every action is text-only.

## Goals

1. Establish a reusable token layer (type, spacing, radius, elevation,
   motion) in `theme.css`, consumed consistently by every component.
2. Fix the four hardcoded-color/font bugs above as part of the same pass.
3. Add a small inline-SVG icon set for existing actions (copy, send,
   delete, search, theme toggle) — no external icon library.
4. Build a real toast notification component to replace the stubbed
   `showNotification()`.
5. Pass over user-facing interface copy (labels, empty states, errors,
   confirm dialogs) for clarity and consistency — not the AI-generated
   outreach messages, which stay out of scope.
6. Improve the priority-row treatment in "Todos os Leads" for clearer
   optical hierarchy.

## Non-goals

- No new palette — beige/sage-green (light) and ink/sage-green (dark)
  stay as approved.
- No charts/analytics view (next sub-project).
- No changes to AI-generated message copy or prompts (separate
  sub-project).
- No scroll/entrance animation choreography (separate sub-project) —
  this pass only covers the transitions naturally needed by the toast
  and any hover/focus states it touches.
- No external icon library or component framework — inline SVG only,
  vanilla JS/CSS as the rest of the app already is.
- No living style-guide page.

## Design

### 1. Tokens (`theme.css`)

Add token blocks below the existing color tokens, same for light and
dark (values that don't change per theme go on bare `:root`; only colors
stay themed):

```css
:root {
  /* existing color tokens unchanged */

  /* Type scale (1.25 ratio, base 16px) */
  --text-xs: 0.75rem;    /* 12px — meta, timestamps */
  --text-sm: 0.85rem;    /* 13.6px — secondary text, labels */
  --text-base: 1rem;     /* 16px — body */
  --text-md: 1.1rem;     /* 17.6px — section headers (h3) */
  --text-lg: 1.3rem;     /* 20.8px — panel headers (h2) */
  --text-xl: 1.6rem;     /* 25.6px — page title, scaled down from current 2rem */
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

[data-theme="dark"] {
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.25);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.35);
}
```

`--text-xl` (1.6rem) replaces the header's current bare `2rem`, which read
oversized next to the new wordmark lockup — one concrete `better-typography`
correction, not a redesign.

### 2. Component pass (`style.css`)

Rewrite existing rules to consume the tokens instead of literal values.
Mechanical, one rule block at a time — no structural HTML changes except
where noted. Specifically:

- Every hardcoded shadow/color noted in "Concrete problems" switches to a
  token: `--shadow-sm`/`--shadow-md` for elevation, `--primary-color-light`
  / `--success-bg` for focus/hover tints (already-defined tokens, just
  wire them in instead of the leftover RGB literals).
- `.message-box` font-family → the existing `.mono` / IBM Plex Mono stack.
- All `padding`/`margin`/`gap` rem values → nearest `--space-*` token.
- All `border-radius` → nearest `--radius-*` token.
- All `font-size` → nearest `--text-*` token.
- `transition` durations → `--duration-fast`/`--duration-base` with
  `--ease-out` (replacing the current unqualified `0.3s`/`ease` defaults).
- `.painel-row--priority`: drop the full-row `--warning-bg` tint; replace
  with a `3px solid var(--warning-color)` left border on the row (same
  pattern already used for `.analysis-section` and `.conversation-message`,
  so it's consistent with an existing convention, not a new one) plus keep
  the existing `.status-badge--priority` badge as the primary signal. Hover
  state becomes a subtle `--hover-bg` background instead of `filter:
  brightness()`.

### 3. Icon system

A single `public/js/icons.js` module exporting small functions that
return inline SVG strings (16×18px viewBox, `stroke="currentColor"`,
`stroke-width="1.75"`, no fill) for: `copy`, `send`, `trash`, `search`,
`sun`, `moon`. Consumers call e.g. `icon('trash')` and interpolate the
returned markup into template strings (matching how `app.js` already
builds HTML via template literals — no new patterns). Icons sit
inline before the button/label text with `--space-2` gap, sized via a
shared `.icon` class (`width/height: 1em`, inherits `currentColor`) so
they scale with the surrounding font-size automatically.

Replaces: 🗑️ delete button, adds icons to "Copiar mensagem", "Enviar
agora", the search input, and the theme toggle (sun/moon rather than the
text "Claro"/"Escuro" alone — icon plus text, not icon-only, since these
are the only two toggle states and losing the text would cost more
clarity than it gains).

### 4. Toast notification component

Replace the stub in `app.js`. New `public/js/toast.js`:

- `showToast(message, type = 'success')` — appends a `.toast` element to
  a `#toastContainer` (fixed-position, bottom-right, added once to
  `index.html`), auto-dismisses after 3.5s, dismissible by click.
- Visual: `--panel-bg` background, `--shadow-md`, left border in
  `--success-color`/`--error-color` per type, small icon (`copy`/`trash`
  reuse existing action icons; a generic check/x for success/error),
  slide-in/fade using `--duration-base`/`--ease-out` — the one animation
  this spec introduces, justified because it's the sole way the user
  currently learns an action succeeded.
- `app.js` swaps its `showNotification()` calls to `showToast()` — no
  call-site logic changes beyond the import and rename.

### 5. Microcopy pass

Scope: labels, button text, empty states, confirm dialogs, error
strings already in `index.html`/`app.js`. Concrete changes:

- Delete-lead confirm and toast messages stay as-is (already clear,
  already reviewed this session).
- Audit every `showError`/`showToast` call site for redundant phrasing
  (e.g. `Erro: ${error.message}` doubles up when `error.message` already
  starts with "Erro" from the backend — normalize to avoid "Erro: Erro
  ..." if it occurs; verify case by case while implementing, not
  speculatively rewritten here).
- No changes to AI-generated analysis/message content — those strings
  come from `src/services/ai.js`, out of scope.

### 6. Testing / verification

Playwright screenshots of all three tabs, light and dark, before and
after, comparing against the current deployed state. Manually trigger a
toast (copy + delete) and confirm it renders and auto-dismisses. No
automated visual regression suite — proportionate to a 2-person internal
tool, not worth the setup cost here.

## Files affected

- `public/css/theme.css` — add token blocks.
- `public/css/style.css` — component pass, consuming tokens; new `.toast`
  rules.
- `public/js/icons.js` — new.
- `public/js/toast.js` — new.
- `public/js/app.js` — import icons/toast, swap `showNotification` →
  `showToast`, use icon helpers in `renderPainel`/button markup.
- `public/index.html` — add `#toastContainer` div; icon markup in
  static buttons (copy/send/theme-toggle).

## Risks

- Token sweep touches nearly every rule in `style.css` — mechanical but
  large diff; mitigated by doing it file-by-file and verifying visually
  before/after rather than trusting the diff alone.
- Toast is the only new animated element; kept to opacity/transform only
  (no layout-shifting animation) to avoid jank.
