# Registro Fotográfico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6-step full-laudo wizard with a single-screen "Registro Fotográfico" tool that uploads photos, lets the user caption and size each one, and exports a PDF matching the real Karrer visual identity (solid blue footer band, bordered photo+caption grid) — dropping every non-photo section (client, property, conclusion, notes, instruments, glossary, references, signatures, cover, summary).

**Architecture:** `PhotoReport`/`PhotoItem` replace `LaudoData`/`ClientData`/`PropertyData` as the sole data model, unchanged `localStorage` persistence via `storage.ts`. The PDF layer shrinks to three files (`footer.ts`, `photos.ts`, `generateLaudo.ts`) implementing a column-based grid (quarter/half/full sizes) with per-cell borders. The UI layer shrinks from a 6-step wizard + 6 step components to one screen (`NewLaudo.tsx`) built from a new `PhotoRow` component and the existing dropzone/select/button primitives.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind, shadcn/ui (`radix-ui` unified package), jsPDF, Vitest + Testing Library. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-09-25-registro-fotografico-design.md`](../specs/2026-09-25-registro-fotografico-design.md)

## Global Constraints

- No new npm dependencies — reuse the existing `Select` component for the per-photo size picker instead of adding a new `ToggleGroup` (the spec's suggestion was illustrative, not a hard requirement; `Select` already exists and is already used for `StepProperty`'s UF picker).
- No migration for the old `LaudoData` shape already sitting in a user's `localStorage` under the `karrer_laudos` key — this is an accepted breaking change; code must not crash on legacy-shaped data, but need not render it meaningfully.
- No drag-and-drop library — reordering is "move up" / "move down" buttons only.
- No client/property/ART/contratante fields anywhere, fixed or optional — fully out of scope, not even as future-facing optional fields.
- PDF: no cover page, no summary page. Title ("Registro Fotográfico") is drawn exactly once, on the first page only. The solid `KARRER_BLUE` footer band is drawn on every page.
- Photo grid geometry starting values (tune visually against the reference PDF during Task 4, don't relitigate the model): `LEFT_MARGIN=15`, `FOOTER_HEIGHT=20`, `CONTENT_TOP=25`, `COLUMN_GAP=4`, `ROW_GAP=6`, `CAPTION_HEIGHT=16` (all mm).
- Caption format is `"N - texto"` (plain sequential number, hyphen) — no section-number prefix.

## Review Focus

- Legacy `LaudoData`-shaped entries already in a real user's `localStorage` (same `karrer_laudos` key, old shape) must not crash `getLaudos()`/the Dashboard/the PDF generator after this ships — pinned in Task 2 (`storage.test.ts`) and Task 4 (`photos.test.ts`, a photo with a missing/invalid `size`).
- A `PhotoItem` with a missing or invalid `size` (from legacy data, since there's no migration) must be drawn as `quarter`, not throw — pinned in Task 4.
- Zero photos: "Gerar PDF" must be disabled in the UI, and `drawPhotosSection`/`generateLaudoPdf` must handle an empty array without throwing (someone could still call the PDF functions directly) — pinned in Task 4 and Task 8.
- A report with no `label` must render a sensible fallback title ("Registro fotográfico — N foto(s)") in the Dashboard, list, and detail page, never a blank or literal "undefined" — pinned in Tasks 9 and 12.
- A failed PDF download must show a visible, specific error and leave the button re-enabled for retry, never fail silently or leave the UI stuck — this pattern already exists in the codebase (commit `fe10d3b`) and must be preserved unchanged — pinned in Tasks 8, 9, and 12.

---

## Task 1: Data model

**Files:**
- Modify: `src/types/laudo.ts`

**Interfaces:**
- Produces: `PhotoSize = "quarter" | "half" | "full"`, `PhotoItem { id, dataUrl, caption, order, size }`, `PhotoReport { id, label?, photos, status, createdAt, updatedAt }` — every later task imports these from `@/types/laudo`.

This task has no dedicated test file (a pure type declaration has nothing to assert against at runtime); its correctness is verified by every later task's tests compiling and passing against it, and by the full-suite typecheck in Task 14.

- [ ] **Step 1: Replace the file's contents**

```ts
export type PhotoSize = "quarter" | "half" | "full";

export interface PhotoItem {
  id: string;
  dataUrl: string; // compressed JPEG data URL, via imageCompression.ts
  caption: string;
  order: number; // 1-based, matches display/print order
  size: PhotoSize;
}

export interface PhotoReport {
  id: string;
  label?: string; // free-text nickname for the dashboard/list only — never printed
  photos: PhotoItem[];
  status: "draft" | "completed";
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/laudo.ts
git commit -m "feat: replace LaudoData model with PhotoReport"
```

---

## Task 2: Storage

**Files:**
- Modify: `src/lib/storage.ts`
- Test: `src/lib/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `PhotoReport` from Task 1.
- Produces: `getLaudos(): PhotoReport[]`, `getLaudo(id): PhotoReport | undefined`, `saveLaudo(report): void`, `deleteLaudo(id): void`, `StorageQuotaError` — same names/shapes as before, only the generic type changes. Every later task that touches persistence (`useLaudoForm`, `Dashboard`, `LaudoList`, `LaudoDetail`, `NewLaudo`) imports these.

- [ ] **Step 1: Write the failing tests**

Replace `src/lib/__tests__/storage.test.ts` entirely:

```ts
import { beforeEach, vi } from "vitest";
import { getLaudos, getLaudo, saveLaudo, deleteLaudo, StorageQuotaError } from "@/lib/storage";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: "report-1",
    label: "Vistoria Rua X",
    photos: [],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getLaudos returns an empty array when nothing is stored", () => {
    expect(getLaudos()).toEqual([]);
  });

  it("saveLaudo adds a new report and getLaudo finds it by id", () => {
    saveLaudo(makeReport());
    expect(getLaudo("report-1")?.label).toBe("Vistoria Rua X");
  });

  it("saveLaudo updates an existing report in place and bumps updatedAt", () => {
    saveLaudo(makeReport({ updatedAt: "2026-09-25T10:00:00.000Z" }));
    saveLaudo(makeReport({ label: "Vistoria revisada" }));

    const reports = getLaudos();
    expect(reports).toHaveLength(1);
    expect(reports[0].label).toBe("Vistoria revisada");
    expect(reports[0].updatedAt).not.toBe("2026-09-25T10:00:00.000Z");
  });

  it("getLaudo returns undefined for an unknown id", () => {
    expect(getLaudo("does-not-exist")).toBeUndefined();
  });

  it("deleteLaudo removes only the targeted report", () => {
    saveLaudo(makeReport({ id: "report-1" }));
    saveLaudo(makeReport({ id: "report-2" }));
    deleteLaudo("report-1");

    const reports = getLaudos();
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe("report-2");
  });

  it("saveLaudo throws StorageQuotaError when localStorage is full", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(() => saveLaudo(makeReport())).toThrow(StorageQuotaError);

    setItemSpy.mockRestore();
  });

  it("does not crash reading a pre-existing entry saved in the old LaudoData shape", () => {
    // Accepted breaking change (see spec): no migration. A user who already
    // has laudos saved from before this feature must not see the app crash —
    // the old-shaped object round-trips through JSON untouched; callers that
    // read the new fields (label, photo.size) just see `undefined`.
    const legacyShaped = {
      id: "old-1",
      type: "vistoria_cautelar",
      client: { name: "Cliente Antigo", document: "", address: "" },
      property: { address: "Rua Antiga", neighborhood: "", city: "", state: "", inspectionDate: "", artNumber: "", description: "" },
      photos: [{ id: "p1", dataUrl: "data:1", caption: "Velha", order: 1 }],
      conclusion: "",
      status: "draft",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    localStorage.setItem("karrer_laudos", JSON.stringify([legacyShaped]));

    expect(() => getLaudos()).not.toThrow();
    const [loaded] = getLaudos();
    expect(loaded.id).toBe("old-1");
    expect(loaded.label).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- storage.test.ts`
Expected: FAIL — `saveLaudo`/`getLaudo` still type against `LaudoData`, and the "old shape" test's `loaded.label` assertion doesn't yet exist as a meaningful field.

- [ ] **Step 3: Update the implementation**

```ts
import type { PhotoReport } from "@/types/laudo";

const STORAGE_KEY = "karrer_laudos";

export class StorageQuotaError extends Error {
  constructor() {
    super("Espaço de armazenamento cheio. Baixe o PDF e exclua rascunhos antigos.");
    this.name = "StorageQuotaError";
  }
}

export function getLaudos(): PhotoReport[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PhotoReport[];
  } catch {
    return [];
  }
}

export function getLaudo(id: string): PhotoReport | undefined {
  return getLaudos().find((l) => l.id === id);
}

export function saveLaudo(report: PhotoReport): void {
  const reports = getLaudos();
  const index = reports.findIndex((l) => l.id === report.id);
  const updated: PhotoReport = { ...report, updatedAt: new Date().toISOString() };

  if (index >= 0) {
    reports[index] = updated;
  } else {
    reports.push(updated);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      throw new StorageQuotaError();
    }
    throw err;
  }
}

export function deleteLaudo(id: string): void {
  const reports = getLaudos().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/__tests__/storage.test.ts
git commit -m "feat: retype storage.ts for PhotoReport"
```

---

## Task 3: PDF chrome (constants, footer, pageHelpers)

**Files:**
- Modify: `src/lib/pdf/constants.ts`
- Modify: `src/lib/pdf/sections/footer.ts`
- Modify: `src/lib/pdf/pageHelpers.ts`
- Delete: `src/lib/pdf/sections/header.ts`
- Delete: `src/lib/pdf/sections/__tests__/cover-header-footer.test.ts`
- Create: `src/lib/pdf/sections/__tests__/footer.test.ts`
- Test: `src/lib/pdf/__tests__/pageHelpers.test.ts`

**Interfaces:**
- Produces: `FOOTER_HEIGHT`, `LEFT_MARGIN` (new exports from `constants.ts`, alongside the existing `KARRER_BLUE`, `PAGE_WIDTH`, `PAGE_HEIGHT`), `drawFooter(doc): void` (rewritten), `drawChrome(doc): void` and `newPage(doc, cursor): void` (both lose the `sectionTitle` parameter). Tasks 4 and 5 depend on all of these exact names/signatures.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/pdf/sections/__tests__/footer.test.ts`:

```ts
import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawFooter } from "@/lib/pdf/sections/footer";

describe("drawFooter", () => {
  it("draws a solid Karrer-blue band with the company name and contact details", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const rectSpy = vi.spyOn(doc, "rect");

    expect(() => drawFooter(doc)).not.toThrow();

    // filled rectangle, not a thin line — this is the "faixa azul lá embaixo"
    // the client asked to keep, confirmed against the real reference PDF.
    expect(rectSpy).toHaveBeenCalledWith(0, expect.any(Number), expect.any(Number), 20, "F");
    expect(textSpy).toHaveBeenCalledWith(
      "KARRER SERVIÇOS DE ENGENHARIA LTDA",
      15,
      expect.any(Number),
    );
    expect(textSpy).toHaveBeenCalledWith(
      "Bernardo Sieverdt Karrer — CREA/SC: 199052-0 — eng.bernardokarrer@hotmail.com — (47) 99977-0433",
      15,
      expect.any(Number),
    );
  });
});
```

Replace `src/lib/pdf/__tests__/pageHelpers.test.ts` entirely:

```ts
import { jsPDF } from "jspdf";
import { drawChrome, newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

function colorAfterSetting(hex: string): string {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setTextColor(hex);
  return doc.getTextColor();
}

const DEFAULT_BODY_COLOR = colorAfterSetting("#334155");
const FOOTER_WHITE = colorAfterSetting("#FFFFFF");

describe("drawChrome", () => {
  it("draws the footer and resets the text color to the default body color afterward", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    drawChrome(doc);

    expect(doc.getTextColor()).toBe(DEFAULT_BODY_COLOR);
    expect(doc.getTextColor()).not.toBe(FOOTER_WHITE);
  });
});

describe("newPage", () => {
  it("adds a page, increments the cursor, and draws chrome without throwing", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor: PageCursor = { pageNumber: 1 };

    expect(() => newPage(doc, cursor)).not.toThrow();
    expect(cursor.pageNumber).toBe(2);
    expect(doc.getNumberOfPages()).toBe(2);
    expect(doc.getTextColor()).toBe(DEFAULT_BODY_COLOR);
  });
});
```

Delete `src/lib/pdf/sections/__tests__/cover-header-footer.test.ts` (it tested `drawCover`/`drawHeader`, both removed by this and the next task).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- footer.test.ts pageHelpers.test.ts`
Expected: FAIL — `drawFooter` still draws a thin line, not a filled band; `drawChrome`/`newPage` still require a `sectionTitle` argument and call `drawHeader`.

- [ ] **Step 3: Update constants.ts**

```ts
export const KARRER_BLUE = "#1B3A6B";
export const KARRER_NAVY = "#0D2040";
export const PAGE_WIDTH = 210; // A4, mm
export const PAGE_HEIGHT = 297; // A4, mm
export const FOOTER_HEIGHT = 20;
export const LEFT_MARGIN = 15;
```

(`KARRER_LIGHTBLUE` is removed — its only consumer was `header.ts`, deleted in Step 5. `KARRER_NAVY` stays even though nothing in `src/lib/pdf` currently uses it — it was already unused before this change, and removing it is outside this task's scope.)

- [ ] **Step 4: Rewrite footer.ts**

```ts
import type { jsPDF } from "jspdf";
import { FOOTER_HEIGHT, KARRER_BLUE, LEFT_MARGIN, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/constants";

export function drawFooter(doc: jsPDF): void {
  doc.setFillColor(KARRER_BLUE);
  doc.rect(0, PAGE_HEIGHT - FOOTER_HEIGHT, PAGE_WIDTH, FOOTER_HEIGHT, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("KARRER SERVIÇOS DE ENGENHARIA LTDA", LEFT_MARGIN, PAGE_HEIGHT - 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Bernardo Sieverdt Karrer — CREA/SC: 199052-0 — eng.bernardokarrer@hotmail.com — (47) 99977-0433",
    LEFT_MARGIN,
    PAGE_HEIGHT - 6,
  );
}
```

- [ ] **Step 5: Delete header.ts and rewrite pageHelpers.ts**

```bash
git rm src/lib/pdf/sections/header.ts
```

```ts
import type { jsPDF } from "jspdf";
import { drawFooter } from "@/lib/pdf/sections/footer";

export interface PageCursor {
  pageNumber: number;
}

const DEFAULT_TEXT_COLOR = "#334155";

export function drawChrome(doc: jsPDF): void {
  drawFooter(doc);
  doc.setTextColor(DEFAULT_TEXT_COLOR);
}

export function newPage(doc: jsPDF, cursor: PageCursor): void {
  doc.addPage();
  cursor.pageNumber += 1;
  drawChrome(doc);
}
```

(`drawFieldList`, `drawBulletList`, `drawTermList` are removed — their only callers were the client/property/instruments/glossary/references sections, all deleted in Task 5.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- footer.test.ts pageHelpers.test.ts`
Expected: PASS

Note: `src/lib/pdf/sections/__tests__/photos-notes.test.ts` and `src/lib/pdf/__tests__/generateLaudo.test.ts` will fail to even import at this point (they reference `drawHeader`/`drawCover`/old signatures) — that's expected and resolved in Tasks 4 and 5. Don't chase those failures now.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pdf/constants.ts src/lib/pdf/sections/footer.ts src/lib/pdf/pageHelpers.ts \
        src/lib/pdf/sections/__tests__/footer.test.ts src/lib/pdf/__tests__/pageHelpers.test.ts
git rm src/lib/pdf/sections/__tests__/cover-header-footer.test.ts
git commit -m "feat: solid footer band, drop per-page header bands"
```

---

## Task 4: Photo grid

**Files:**
- Modify: `src/lib/pdf/sections/photos.ts`
- Create: `src/lib/pdf/sections/__tests__/photos.test.ts`
- Delete: `src/lib/pdf/sections/__tests__/photos-notes.test.ts`

**Interfaces:**
- Consumes: `PhotoItem`/`PhotoSize` (Task 1), `newPage`/`PageCursor` (Task 3), `FOOTER_HEIGHT`/`LEFT_MARGIN`/`PAGE_WIDTH`/`PAGE_HEIGHT` (Task 3).
- Produces: `drawPhotosSection(doc, photos, cursor): void` — same name, new signature drops nothing (still `(doc, photos, cursor)`) but the drawing behavior is entirely new. Task 5 depends on this exact name/signature.

The grid model: each page has 2 columns. A `quarter` photo takes half a column's height (2 stack per column); a `half` photo takes an entire column (full content height); a `full` photo takes both columns (the whole page) and always gets its own page. Column state is tracked fresh per page as `[slotsUsedInCol0, slotsUsedInCol1]`, each `0` (empty), `1` (one quarter placed), or `2` (full — either two quarters or one half).

- [ ] **Step 1: Write the failing tests**

Delete `src/lib/pdf/sections/__tests__/photos-notes.test.ts` (it also covered `drawNotesSection`, deleted in Task 5 — that coverage isn't replaced, the feature is gone).

Create `src/lib/pdf/sections/__tests__/photos.test.ts`:

```ts
import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawPhotosSection } from "@/lib/pdf/sections/photos";
import type { PhotoItem } from "@/types/laudo";

function stubImageProps(doc: jsPDF) {
  vi.spyOn(doc, "getImageProperties").mockReturnValue({
    width: 1600,
    height: 1200,
  } as ReturnType<jsPDF["getImageProperties"]>);
}

function makePhoto(overrides: Partial<PhotoItem> & { id: string; order: number }): PhotoItem {
  return {
    dataUrl: "data:image/jpeg;base64,FAKE",
    caption: "",
    size: "quarter",
    ...overrides,
  };
}

describe("drawPhotosSection", () => {
  it("numbers captions as 'N - legenda' and falls back to 'Sem legenda'", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawPhotosSection(
      doc,
      [
        makePhoto({ id: "1", order: 1, caption: "Fachada" }),
        makePhoto({ id: "2", order: 2, caption: "" }),
      ],
      cursor,
    );

    expect(textSpy).toHaveBeenCalledWith(
      expect.arrayContaining(["1 - Fachada"]),
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: "center" }),
    );
    expect(textSpy).toHaveBeenCalledWith(
      expect.arrayContaining(["2 - Sem legenda"]),
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: "center" }),
    );
  });

  it("fits 4 quarter photos on a single page (2x2), and a 5th starts a new page", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const cursor = { pageNumber: 1 };

    const photos = Array.from({ length: 5 }, (_, i) => makePhoto({ id: `${i}`, order: i + 1 }));
    drawPhotosSection(doc, photos, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(doc.getNumberOfPages()).toBe(2);
  });

  it("puts two half photos side by side on one page", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const cursor = { pageNumber: 1 };

    drawPhotosSection(
      doc,
      [
        makePhoto({ id: "1", order: 1, size: "half" }),
        makePhoto({ id: "2", order: 2, size: "half" }),
      ],
      cursor,
    );

    expect(cursor.pageNumber).toBe(1);
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("gives a full-size photo its own page, before and after", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const cursor = { pageNumber: 1 };

    drawPhotosSection(
      doc,
      [
        makePhoto({ id: "1", order: 1, size: "quarter" }),
        makePhoto({ id: "2", order: 2, size: "full" }),
        makePhoto({ id: "3", order: 3, size: "quarter" }),
      ],
      cursor,
    );

    // page 1: the lone leading quarter; page 2: the full photo alone; page 3: the trailing quarter
    expect(doc.getNumberOfPages()).toBe(3);
  });

  it("backfills a column's remaining quarter slot with a later quarter photo", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    const addImageSpy = vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const cursor = { pageNumber: 1 };

    // quarter (col 0 top) -> half (jumps to col 1, fills it) -> quarter
    // (must backfill col 0's still-empty bottom slot, not start a new page)
    drawPhotosSection(
      doc,
      [
        makePhoto({ id: "1", order: 1, size: "quarter" }),
        makePhoto({ id: "2", order: 2, size: "half" }),
        makePhoto({ id: "3", order: 3, size: "quarter" }),
      ],
      cursor,
    );

    expect(doc.getNumberOfPages()).toBe(1);
    expect(addImageSpy).toHaveBeenCalledTimes(3);
  });

  it("treats a photo with a missing/invalid size as quarter (legacy data has no size field)", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const cursor = { pageNumber: 1 };

    const legacyPhoto = { id: "1", order: 1, dataUrl: "data:image/jpeg;base64,FAKE", caption: "" } as PhotoItem;
    drawPhotosSection(doc, [legacyPhoto], cursor);

    // one quarter photo alone must not force a page break
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("does nothing for an empty photo list", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor = { pageNumber: 1 };

    expect(() => drawPhotosSection(doc, [], cursor)).not.toThrow();
    expect(doc.getNumberOfPages()).toBe(1);
    expect(cursor.pageNumber).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- photos.test.ts`
Expected: FAIL — the current `photos.ts` draws a fixed 2-column/no-size grid with `"4.N — texto"` captions and no borders.

- [ ] **Step 3: Rewrite photos.ts**

```ts
import type { jsPDF } from "jspdf";
import type { PhotoItem } from "@/types/laudo";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";
import { FOOTER_HEIGHT, LEFT_MARGIN, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/constants";

const COLUMN_GAP = 4;
const ROW_GAP = 6;
const CAPTION_HEIGHT = 16;
const CONTENT_TOP = 25;
const CONTENT_BOTTOM = PAGE_HEIGHT - FOOTER_HEIGHT - 5;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN * 2;
const COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2;
const CONTENT_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP;
const QUARTER_CELL_HEIGHT = (CONTENT_HEIGHT - ROW_GAP) / 2;
const BORDER_COLOR = "#334155";

interface Cell {
  x: number;
  y: number;
  width: number;
  height: number;
}

function columnX(col: number): number {
  return col === 0 ? LEFT_MARGIN : LEFT_MARGIN + COLUMN_WIDTH + COLUMN_GAP;
}

function fitImage(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
): void {
  const { width: pxWidth, height: pxHeight } = doc.getImageProperties(dataUrl);
  const aspect = pxWidth / pxHeight;
  const boxAspect = boxWidth / boxHeight;

  const drawWidth = aspect > boxAspect ? boxWidth : boxHeight * aspect;
  const drawHeight = aspect > boxAspect ? boxWidth / aspect : boxHeight;

  doc.addImage(
    dataUrl,
    "JPEG",
    x + (boxWidth - drawWidth) / 2,
    y + (boxHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawCell(doc: jsPDF, cell: Cell, dataUrl: string, captionText: string): void {
  const imageHeight = cell.height - CAPTION_HEIGHT;

  doc.setDrawColor(BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.rect(cell.x, cell.y, cell.width, imageHeight);
  doc.rect(cell.x, cell.y + imageHeight, cell.width, CAPTION_HEIGHT);

  fitImage(doc, dataUrl, cell.x, cell.y, cell.width, imageHeight);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(BORDER_COLOR);
  const lines = doc.splitTextToSize(captionText, cell.width - 4);
  doc.text(lines, cell.x + cell.width / 2, cell.y + imageHeight + CAPTION_HEIGHT / 2, {
    align: "center",
    baseline: "middle",
  });
}

export function drawPhotosSection(doc: jsPDF, photos: PhotoItem[], cursor: PageCursor): void {
  let columns = [0, 0];

  function goToFreshPage(): void {
    newPage(doc, cursor);
    columns = [0, 0];
  }

  photos.forEach((photo) => {
    const caption = `${photo.order} - ${photo.caption || "Sem legenda"}`;

    if (photo.size === "full") {
      if (columns.some((used) => used > 0)) goToFreshPage();
      drawCell(
        doc,
        { x: LEFT_MARGIN, y: CONTENT_TOP, width: CONTENT_WIDTH, height: CONTENT_HEIGHT },
        photo.dataUrl,
        caption,
      );
      goToFreshPage();
      return;
    }

    if (photo.size === "half") {
      let col = columns.findIndex((used) => used === 0);
      if (col === -1) {
        goToFreshPage();
        col = 0;
      }
      drawCell(
        doc,
        { x: columnX(col), y: CONTENT_TOP, width: COLUMN_WIDTH, height: CONTENT_HEIGHT },
        photo.dataUrl,
        caption,
      );
      columns[col] = 2;
      return;
    }

    // "quarter", and the fallback for legacy data with no/invalid size
    let col = columns.findIndex((used) => used < 2);
    if (col === -1) {
      goToFreshPage();
      col = 0;
    }
    const topHalf = columns[col] === 0;
    const y = topHalf ? CONTENT_TOP : CONTENT_TOP + QUARTER_CELL_HEIGHT + ROW_GAP;
    drawCell(doc, { x: columnX(col), y, width: COLUMN_WIDTH, height: QUARTER_CELL_HEIGHT }, photo.dataUrl, caption);
    columns[col] += 1;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- photos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/sections/photos.ts src/lib/pdf/sections/__tests__/photos.test.ts
git rm src/lib/pdf/sections/__tests__/photos-notes.test.ts
git commit -m "feat: bordered quarter/half/full photo grid"
```

---

## Task 5: Orchestration and removal of the other PDF sections

**Files:**
- Modify: `src/lib/pdf/generateLaudo.ts`
- Test: `src/lib/pdf/__tests__/generateLaudo.test.ts`
- Delete: `src/lib/pdf/sections/{cover,client,property,conclusion,notes,instruments,glossary,references,signatures,summary}.ts`
- Delete: `src/lib/pdf/content/{glossary,instruments,references}.ts` and the now-empty `src/lib/pdf/content/` directory
- Delete: `src/lib/pdf/sections/__tests__/{client-property-conclusion,instruments-glossary-references,summary-signatures}.test.ts`
- Delete: `src/lib/pdf/content/__tests__/fixed-content.test.ts` and the now-empty `src/lib/pdf/content/__tests__/` directory

**Interfaces:**
- Consumes: `PhotoReport` (Task 1), `drawChrome`/`PageCursor` (Task 3), `drawPhotosSection` (Task 4), `LEFT_MARGIN` (Task 3).
- Produces: `generateLaudoPdf(report: PhotoReport): jsPDF`, `downloadLaudoPdf(report: PhotoReport): void`. Tasks 8, 9, 12 (every screen with a "Baixar PDF"/"Gerar PDF" action) depend on these two exact names and the `PhotoReport` parameter.

- [ ] **Step 1: Write the failing tests**

Replace `src/lib/pdf/__tests__/generateLaudo.test.ts` entirely:

```ts
import { vi } from "vitest";
import { generateLaudoPdf, downloadLaudoPdf } from "@/lib/pdf/generateLaudo";
import type { PhotoReport } from "@/types/laudo";

// jsPDF v4 assigns its core drawing methods (text, save, addPage, ...) as
// fresh closures created *inside the constructor* of each instance, not on
// jsPDF.prototype (confirmed empirically — plugin methods like addImage are
// prototype-reachable, but text/save are not). generateLaudoPdf() builds its
// own internal jsPDF instance and doesn't expose it, so there's no handle to
// spy on after construction. Instead, wrap the constructor itself so every
// instance is spied the moment it's created, exposing the most recently
// created instance's spies for the tests below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastTextSpy: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastSaveSpy: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastAddImageSpy: any;

vi.mock("jspdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jspdf")>();

  class SpiedJsPDF extends actual.jsPDF {
    constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
      super(...args);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = this as any;
      lastTextSpy = vi.spyOn(instance, "text");
      lastSaveSpy = vi.spyOn(instance, "save").mockImplementation(() => {});
      lastAddImageSpy = vi.spyOn(instance, "addImage").mockReturnValue(instance);
      vi.spyOn(instance, "getImageProperties").mockReturnValue({ width: 1600, height: 1200 });
    }
  }

  return { ...actual, jsPDF: SpiedJsPDF };
});

const sampleReport: PhotoReport = {
  id: "1",
  label: "Rua Liberia 825",
  photos: [
    { id: "p1", dataUrl: "data:image/jpeg;base64,FAKE1", caption: "Fachada", order: 1, size: "quarter" },
    { id: "p2", dataUrl: "data:image/jpeg;base64,FAKE2", caption: "Fundos", order: 2, size: "quarter" },
  ],
  status: "completed",
  createdAt: "2026-09-25T10:00:00.000Z",
  updatedAt: "2026-09-25T10:00:00.000Z",
};

describe("generateLaudoPdf", () => {
  it("draws the title once on the first page and every photo, without throwing", () => {
    const doc = generateLaudoPdf(sampleReport);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(lastTextSpy).toHaveBeenCalledWith("Registro Fotográfico", 15, 18);
    expect(lastAddImageSpy).toHaveBeenCalledTimes(2);
  });

  it("does not repeat the title on later pages", () => {
    const manyPhotos = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      dataUrl: "data:image/jpeg;base64,FAKE",
      caption: `Foto ${i}`,
      order: i + 1,
      size: "quarter" as const,
    }));

    const doc = generateLaudoPdf({ ...sampleReport, photos: manyPhotos });

    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const titleCalls = lastTextSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === "Registro Fotográfico",
    );
    expect(titleCalls).toHaveLength(1);
  });

  it("handles a report with no photos without throwing", () => {
    expect(() => generateLaudoPdf({ ...sampleReport, photos: [] })).not.toThrow();
  });
});

describe("downloadLaudoPdf", () => {
  it("calls doc.save with a filesystem-safe filename derived from the report label", () => {
    downloadLaudoPdf(sampleReport);
    expect(lastSaveSpy).toHaveBeenCalledWith("registro-fotografico-Rua_Liberia_825.pdf");
  });

  it("falls back to the report id when there is no label", () => {
    downloadLaudoPdf({ ...sampleReport, label: undefined });
    expect(lastSaveSpy).toHaveBeenCalledWith("registro-fotografico-1.pdf");
  });
});
```

Delete the three superseded section test files and the fixed-content test:

```bash
git rm src/lib/pdf/sections/__tests__/client-property-conclusion.test.ts \
       src/lib/pdf/sections/__tests__/instruments-glossary-references.test.ts \
       src/lib/pdf/sections/__tests__/summary-signatures.test.ts \
       src/lib/pdf/content/__tests__/fixed-content.test.ts
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- generateLaudo.test.ts`
Expected: FAIL — `generateLaudoPdf` still draws a cover, summary, and every other section.

- [ ] **Step 3: Delete the removed sections and content**

```bash
git rm src/lib/pdf/sections/cover.ts src/lib/pdf/sections/client.ts src/lib/pdf/sections/property.ts \
       src/lib/pdf/sections/conclusion.ts src/lib/pdf/sections/notes.ts src/lib/pdf/sections/instruments.ts \
       src/lib/pdf/sections/glossary.ts src/lib/pdf/sections/references.ts src/lib/pdf/sections/signatures.ts \
       src/lib/pdf/sections/summary.ts
git rm -r src/lib/pdf/content
```

- [ ] **Step 4: Rewrite generateLaudo.ts**

```ts
import { jsPDF } from "jspdf";
import type { PhotoReport } from "@/types/laudo";
import { drawChrome, type PageCursor } from "@/lib/pdf/pageHelpers";
import { drawPhotosSection } from "@/lib/pdf/sections/photos";
import { LEFT_MARGIN } from "@/lib/pdf/constants";

export function generateLaudoPdf(report: PhotoReport): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cursor: PageCursor = { pageNumber: 1 };

  drawChrome(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#334155");
  doc.text("Registro Fotográfico", LEFT_MARGIN, 18);

  drawPhotosSection(doc, report.photos, cursor);

  return doc;
}

export function downloadLaudoPdf(report: PhotoReport): void {
  const doc = generateLaudoPdf(report);
  const safeName = `registro-fotografico-${report.label || report.id}.pdf`.replace(/[^\w.-]+/g, "_");
  doc.save(safeName);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- generateLaudo.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdf/generateLaudo.ts src/lib/pdf/__tests__/generateLaudo.test.ts
git commit -m "feat: generate photos-only PDF, remove full-laudo sections"
```

---

## Task 6: useLaudoForm

**Files:**
- Modify: `src/hooks/useLaudoForm.ts`
- Test: `src/hooks/__tests__/useLaudoForm.test.tsx`

**Interfaces:**
- Consumes: `PhotoItem`/`PhotoReport`/`PhotoSize` (Task 1), `getLaudo`/`saveLaudo`/`StorageQuotaError` (Task 2).
- Produces: `useLaudoForm(id?)` returning `{ report, saveError, updateLabel, addPhotos, updateCaption, updateSize, removePhoto, removeAllPhotos, movePhoto, saveDraft, complete }`. Task 8 (`NewLaudo.tsx`) consumes every one of these exact names.

- [ ] **Step 1: Write the failing tests**

Replace `src/hooks/__tests__/useLaudoForm.test.tsx` entirely:

```tsx
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { useLaudoForm } from "@/hooks/useLaudoForm";
import * as storage from "@/lib/storage";

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

function photo(id: string) {
  return { id, dataUrl: `data:${id}`, caption: "", order: 0, size: "quarter" as const };
}

describe("useLaudoForm", () => {
  beforeEach(() => localStorage.clear());

  it("starts with an empty draft", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    expect(result.current.report.status).toBe("draft");
    expect(result.current.report.photos).toEqual([]);
  });

  it("updateLabel updates the draft's label", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.updateLabel("Vistoria Rua X"));
    expect(result.current.report.label).toBe("Vistoria Rua X");
  });

  it("addPhotos appends and numbers photos from 1", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a"), photo("b")]));
    expect(result.current.report.photos.map((p) => p.order)).toEqual([1, 2]);
  });

  it("addPhotos merges onto the latest state, not a stale snapshot", () => {
    // Regression guard: addPhotos uses React's functional setState updater
    // internally, so a caller awaiting something async (image compression)
    // before calling it can never clobber state changed in the meantime.
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a")]));
    act(() => result.current.updateLabel("Set during the gap"));
    act(() => result.current.addPhotos([photo("b")]));

    expect(result.current.report.label).toBe("Set during the gap");
    expect(result.current.report.photos.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("updateCaption updates only the targeted photo", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a"), photo("b")]));
    act(() => result.current.updateCaption("a", "Fachada"));
    expect(result.current.report.photos.find((p) => p.id === "a")?.caption).toBe("Fachada");
    expect(result.current.report.photos.find((p) => p.id === "b")?.caption).toBe("");
  });

  it("updateSize updates only the targeted photo", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a")]));
    act(() => result.current.updateSize("a", "full"));
    expect(result.current.report.photos[0].size).toBe("full");
  });

  it("removePhoto removes and renumbers the rest", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a"), photo("b")]));
    act(() => result.current.removePhoto("a"));
    expect(result.current.report.photos).toEqual([{ ...photo("b"), order: 1 }]);
  });

  it("removeAllPhotos clears the list", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a")]));
    act(() => result.current.removeAllPhotos());
    expect(result.current.report.photos).toEqual([]);
  });

  it("movePhoto swaps with the neighbor, renumbers, and clamps at the ends", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a"), photo("b")]));

    act(() => result.current.movePhoto("b", "up"));
    expect(result.current.report.photos.map((p) => p.id)).toEqual(["b", "a"]);

    act(() => result.current.movePhoto("b", "up")); // already first, no-op
    expect(result.current.report.photos.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("saveDraft persists the report with status draft", () => {
    const saveSpy = vi.spyOn(storage, "saveLaudo");
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.saveDraft());
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
  });

  it("complete persists the report with status completed and returns true", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    let success: boolean | undefined;
    act(() => {
      success = result.current.complete();
    });
    expect(success).toBe(true);
    expect(storage.getLaudos()[0].status).toBe("completed");
  });

  it("seeds the initial report from getLaudo(id) when an id is provided", () => {
    storage.saveLaudo({
      id: "draft-1",
      label: "Antigo",
      photos: [],
      status: "draft",
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    });

    const { result } = renderHook(() => useLaudoForm("draft-1"), { wrapper });
    expect(result.current.report.id).toBe("draft-1");
    expect(result.current.report.label).toBe("Antigo");
  });

  it("falls back to an empty draft when the id doesn't match a saved report", () => {
    const { result } = renderHook(() => useLaudoForm("does-not-exist"), { wrapper });
    expect(result.current.report.id).not.toBe("does-not-exist");
    expect(result.current.report.status).toBe("draft");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- useLaudoForm.test.tsx`
Expected: FAIL — the current hook exposes `laudo`/`step`/`updateType`/etc., not `report`/`addPhotos`/etc.

- [ ] **Step 3: Rewrite useLaudoForm.ts**

```ts
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PhotoItem, PhotoReport, PhotoSize } from "@/types/laudo";
import { getLaudo, saveLaudo, StorageQuotaError } from "@/lib/storage";

function emptyReport(): PhotoReport {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), label: "", photos: [], status: "draft", createdAt: now, updatedAt: now };
}

function renumber(photos: PhotoItem[]): PhotoItem[] {
  return photos.map((p, i) => ({ ...p, order: i + 1 }));
}

export function useLaudoForm(id?: string) {
  const navigate = useNavigate();
  const [report, setReport] = useState<PhotoReport>(() => (id ? (getLaudo(id) ?? emptyReport()) : emptyReport()));
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateLabel = useCallback((label: string) => setReport((r) => ({ ...r, label })), []);

  const addPhotos = useCallback((newPhotos: PhotoItem[]) => {
    setReport((r) => ({ ...r, photos: renumber([...r.photos, ...newPhotos]) }));
  }, []);

  const updateCaption = useCallback((id: string, caption: string) => {
    setReport((r) => ({ ...r, photos: r.photos.map((p) => (p.id === id ? { ...p, caption } : p)) }));
  }, []);

  const updateSize = useCallback((id: string, size: PhotoSize) => {
    setReport((r) => ({ ...r, photos: r.photos.map((p) => (p.id === id ? { ...p, size } : p)) }));
  }, []);

  const removePhoto = useCallback((id: string) => {
    setReport((r) => ({ ...r, photos: renumber(r.photos.filter((p) => p.id !== id)) }));
  }, []);

  const removeAllPhotos = useCallback(() => {
    setReport((r) => ({ ...r, photos: [] }));
  }, []);

  const movePhoto = useCallback((id: string, direction: "up" | "down") => {
    setReport((r) => {
      const index = r.photos.findIndex((p) => p.id === id);
      if (index === -1) return r;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= r.photos.length) return r;
      const photos = [...r.photos];
      [photos[index], photos[targetIndex]] = [photos[targetIndex], photos[index]];
      return { ...r, photos: renumber(photos) };
    });
  }, []);

  const persist = useCallback(
    (status: "draft" | "completed") => {
      setSaveError(null);
      const toSave: PhotoReport = { ...report, status };
      try {
        saveLaudo(toSave);
        setReport(toSave);
        return true;
      } catch (err) {
        setSaveError(err instanceof StorageQuotaError ? err.message : "Erro ao salvar o registro.");
        return false;
      }
    },
    [report],
  );

  function saveDraft() {
    if (persist("draft")) navigate("/laudos");
  }

  function complete() {
    return persist("completed");
  }

  return {
    report,
    saveError,
    updateLabel,
    addPhotos,
    updateCaption,
    updateSize,
    removePhoto,
    removeAllPhotos,
    movePhoto,
    saveDraft,
    complete,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- useLaudoForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLaudoForm.ts src/hooks/__tests__/useLaudoForm.test.tsx
git commit -m "feat: rewrite useLaudoForm around PhotoReport"
```

---

## Task 7: PhotoRow component

**Files:**
- Create: `src/components/laudo/PhotoRow.tsx`
- Create: `src/components/laudo/__tests__/PhotoRow.test.tsx`

**Interfaces:**
- Consumes: `PhotoItem`/`PhotoSize` (Task 1), `Badge`/`Input`/`Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` (existing shadcn components, unchanged).
- Produces: `PhotoRow` component with props `{ photo, isFirst, isLast, onCaptionChange, onSizeChange, onMoveUp, onMoveDown, onRemove }`. Task 8 (`NewLaudo.tsx`) renders this once per photo.

- [ ] **Step 1: Write the failing tests**

Create `src/components/laudo/__tests__/PhotoRow.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { PhotoRow } from "@/components/laudo/PhotoRow";
import type { PhotoItem } from "@/types/laudo";

function makePhoto(overrides: Partial<PhotoItem> = {}): PhotoItem {
  return { id: "p1", dataUrl: "data:image/jpeg;base64,FAKE", caption: "", order: 1, size: "quarter", ...overrides };
}

function renderRow(overrides: Partial<PhotoItem> = {}, propOverrides: Partial<React.ComponentProps<typeof PhotoRow>> = {}) {
  return render(
    <PhotoRow
      photo={makePhoto(overrides)}
      isFirst={false}
      isLast={false}
      onCaptionChange={vi.fn()}
      onSizeChange={vi.fn()}
      onMoveUp={vi.fn()}
      onMoveDown={vi.fn()}
      onRemove={vi.fn()}
      {...propOverrides}
    />,
  );
}

describe("PhotoRow", () => {
  it("shows the photo's order badge and caption", () => {
    renderRow({ caption: "Fachada" });
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Fachada")).toBeInTheDocument();
  });

  it("calls onCaptionChange when the caption is edited", () => {
    const onCaptionChange = vi.fn();
    renderRow({}, { onCaptionChange });
    fireEvent.change(screen.getByPlaceholderText(/legenda/i), { target: { value: "Fundos" } });
    expect(onCaptionChange).toHaveBeenCalledWith("Fundos");
  });

  it("calls onSizeChange when a different size is selected", async () => {
    const user = userEvent.setup();
    const onSizeChange = vi.fn();
    renderRow({}, { onSizeChange });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Página inteira" }));

    expect(onSizeChange).toHaveBeenCalledWith("full");
  });

  it("disables move up on the first item and move down on the last item", () => {
    renderRow({}, { isFirst: true, isLast: true });
    expect(screen.getByRole("button", { name: /mover foto 1 para cima/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /mover foto 1 para baixo/i })).toBeDisabled();
  });

  it("calls onMoveUp, onMoveDown, and onRemove", () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onRemove = vi.fn();
    renderRow({}, { onMoveUp, onMoveDown, onRemove });

    fireEvent.click(screen.getByRole("button", { name: /mover foto 1 para cima/i }));
    fireEvent.click(screen.getByRole("button", { name: /mover foto 1 para baixo/i }));
    fireEvent.click(screen.getByRole("button", { name: /remover foto 1/i }));

    expect(onMoveUp).toHaveBeenCalled();
    expect(onMoveDown).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- PhotoRow.test.tsx`
Expected: FAIL — `src/components/laudo/PhotoRow.tsx` doesn't exist yet.

- [ ] **Step 3: Create PhotoRow.tsx**

```tsx
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PhotoItem, PhotoSize } from "@/types/laudo";

const SIZE_LABELS: Record<PhotoSize, string> = {
  quarter: "1/4",
  half: "1/2",
  full: "Página inteira",
};

export interface PhotoRowProps {
  photo: PhotoItem;
  isFirst: boolean;
  isLast: boolean;
  onCaptionChange: (caption: string) => void;
  onSizeChange: (size: PhotoSize) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function PhotoRow({
  photo,
  isFirst,
  isLast,
  onCaptionChange,
  onSizeChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: PhotoRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-2">
      <img src={photo.dataUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
      <Badge className="bg-karrer-blue">{photo.order}</Badge>
      <Input
        value={photo.caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder="Legenda da foto"
        className="flex-1"
      />
      <Select value={photo.size} onValueChange={(value) => onSizeChange(value as PhotoSize)}>
        <SelectTrigger aria-label={`Tamanho da foto ${photo.order}`} className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quarter">{SIZE_LABELS.quarter}</SelectItem>
          <SelectItem value="half">{SIZE_LABELS.half}</SelectItem>
          <SelectItem value="full">{SIZE_LABELS.full}</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex flex-col">
        <button
          type="button"
          aria-label={`Mover foto ${photo.order} para cima`}
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-slate-400 hover:text-karrer-blue disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          aria-label={`Mover foto ${photo.order} para baixo`}
          onClick={onMoveDown}
          disabled={isLast}
          className="text-slate-400 hover:text-karrer-blue disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronDown size={16} />
        </button>
      </div>
      <button
        type="button"
        aria-label={`Remover foto ${photo.order}`}
        onClick={onRemove}
        className="text-slate-400 hover:text-red-600"
      >
        <X size={18} />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- PhotoRow.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/laudo/PhotoRow.tsx src/components/laudo/__tests__/PhotoRow.test.tsx
git commit -m "feat: add PhotoRow (caption + size + reorder + remove)"
```

---

## Task 8: Single-screen NewLaudo, remove the wizard

**Files:**
- Modify: `src/pages/NewLaudo.tsx`
- Test: `src/pages/__tests__/NewLaudo.test.tsx`
- Delete: `src/pages/steps/{StepType,StepClient,StepProperty,StepPhotos,StepConclusion,StepReview}.tsx`
- Delete: `src/pages/steps/__tests__/{StepType,StepClient,StepProperty,StepPhotos,StepConclusion,StepReview}.test.tsx` and the now-empty `src/pages/steps/` directory
- Delete: `src/components/form/ProgressBar.tsx`, `src/components/form/__tests__/ProgressBar.test.tsx`, and the now-empty `src/components/form/` directory
- Delete: `src/lib/masks.ts`, `src/lib/__tests__/masks.test.ts` (only consumer was `StepClient.tsx`)

**Interfaces:**
- Consumes: `useLaudoForm` (Task 6), `PhotoRow` (Task 7), `downloadLaudoPdf` (Task 5), `compressImageFile` (existing, unchanged), `FileDropzone`/`Input`/`Button`/`ShimmerButton` (existing, unchanged).

- [ ] **Step 1: Write the failing tests**

Replace `src/pages/__tests__/NewLaudo.test.tsx` entirely:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { vi } from "vitest";
import NewLaudo from "@/pages/NewLaudo";
import { saveLaudo } from "@/lib/storage";
import * as imageCompression from "@/lib/imageCompression";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { PhotoReport } from "@/types/laudo";

function makeFile(name: string) {
  return new File(["fake"], name, { type: "image/jpeg" });
}

const draftWithLabel: PhotoReport = {
  id: "draft-1",
  label: "Registro Antigo",
  photos: [{ id: "p1", dataUrl: "data:1", caption: "Fachada", order: 1, size: "quarter" }],
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function NavToNewButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/novo-laudo")}>Novo Registro</button>;
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/novo-laudo/draft-1"]}>
      <NavToNewButton />
      <Routes>
        <Route path="/novo-laudo" element={<NewLaudo />} />
        <Route path="/novo-laudo/:id" element={<NewLaudo />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NewLaudo", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(imageCompression, "compressImageFile").mockResolvedValue("data:image/jpeg;base64,FAKE");
  });
  afterEach(() => vi.restoreAllMocks());

  it("resets the form when navigating from /novo-laudo/:id to /novo-laudo without a full page reload", () => {
    saveLaudo(draftWithLabel);
    renderScreen();

    expect(screen.getByLabelText(/apelido/i)).toHaveValue("Registro Antigo");

    fireEvent.click(screen.getByText("Novo Registro"));

    expect(screen.getByLabelText(/apelido/i)).toHaveValue("");
    expect(screen.queryByDisplayValue("Fachada")).not.toBeInTheDocument();
  });

  it("uploads and compresses photos, adding them numbered from 1", async () => {
    renderScreen(); // starts on the existing draft, which already has 1 photo
    fireEvent.drop(screen.getByRole("button", { name: /arraste fotos/i }), {
      dataTransfer: { files: [makeFile("a.jpg"), makeFile("b.jpg")] },
    });

    await waitFor(() => expect(screen.getAllByPlaceholderText(/legenda/i)).toHaveLength(3));
    expect(screen.getByText("3")).toBeInTheDocument(); // last photo's order badge
  });

  it("disables Gerar PDF with 0 photos and enables it once a photo is added", async () => {
    render(
      <MemoryRouter initialEntries={["/novo-laudo"]}>
        <Routes>
          <Route path="/novo-laudo" element={<NewLaudo />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /gerar pdf/i })).toBeDisabled();

    fireEvent.drop(screen.getByRole("button", { name: /arraste fotos/i }), {
      dataTransfer: { files: [makeFile("a.jpg")] },
    });

    await waitFor(() => expect(screen.getByRole("button", { name: /gerar pdf/i })).not.toBeDisabled());
  });

  it("removes a photo and renumbers the rest", async () => {
    saveLaudo({
      ...draftWithLabel,
      photos: [
        { id: "p1", dataUrl: "data:1", caption: "Um", order: 1, size: "quarter" },
        { id: "p2", dataUrl: "data:2", caption: "Dois", order: 2, size: "quarter" },
      ],
    });
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /remover foto 1/i }));

    await waitFor(() => expect(screen.queryByDisplayValue("Um")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue("Dois")).toBeInTheDocument();
  });

  it("generates the PDF and shows an error if the download itself fails", async () => {
    saveLaudo(draftWithLabel);
    vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {
      throw new Error("boom");
    });
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /gerar pdf/i }));

    await waitFor(() =>
      expect(screen.getByText(/download do pdf falhou/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- NewLaudo.test.tsx`
Expected: FAIL — `NewLaudo.tsx` still renders the 6-step wizard.

- [ ] **Step 3: Delete the wizard steps, ProgressBar, and masks**

```bash
git rm -r src/pages/steps
git rm -r src/components/form
git rm src/lib/masks.ts src/lib/__tests__/masks.test.ts
```

- [ ] **Step 4: Rewrite NewLaudo.tsx**

```tsx
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useLaudoForm } from "@/hooks/useLaudoForm";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { PhotoRow } from "@/components/laudo/PhotoRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { compressImageFile } from "@/lib/imageCompression";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";
import type { PhotoItem } from "@/types/laudo";

export default function NewLaudo() {
  const { id } = useParams<{ id: string }>();
  // Keying on `id` forces a full remount when navigating between
  // /novo-laudo, /novo-laudo/:id, or between two different :id values
  // client-side (no page reload) — without it, React reuses the same
  // component instance and useLaudoForm's lazy useState initializer never
  // re-runs, leaking a previously-loaded draft into what the user believes
  // is a fresh registro.
  return <NewLaudoScreen key={id ?? "new"} id={id} />;
}

function NewLaudoScreen({ id }: { id?: string }) {
  const form = useLaudoForm(id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleFilesSelected(files: File[]) {
    const newPhotos: PhotoItem[] = [];
    for (const file of files) {
      const dataUrl = await compressImageFile(file);
      newPhotos.push({ id: crypto.randomUUID(), dataUrl, caption: "", order: 0, size: "quarter" });
    }
    form.addPhotos(newPhotos);
  }

  function handleGeneratePdf() {
    if (isGenerating) return;
    const success = form.complete();
    if (!success) return;

    setDownloadError(null);
    setIsGenerating(true);
    // Defer to the next tick so React can paint the "Gerando PDF…" state
    // before the synchronous PDF build blocks the main thread.
    setTimeout(() => {
      try {
        downloadLaudoPdf(form.report);
      } catch {
        setDownloadError("O registro foi salvo, mas o download do PDF falhou. Tente baixar novamente.");
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold text-karrer-navy">Novo Registro Fotográfico</h1>

      <label htmlFor="report-label" className="mb-1 block text-sm font-medium text-slate-700">
        Apelido (opcional, só para você localizar depois — não aparece no PDF)
      </label>
      <Input
        id="report-label"
        value={form.report.label ?? ""}
        onChange={(e) => form.updateLabel(e.target.value)}
        className="mb-6"
        placeholder="Ex: Vistoria Rua Libéria 825"
      />

      <FileDropzone onFilesSelected={handleFilesSelected} className="mb-4" />

      {form.report.photos.length > 0 && (
        <>
          <div className="mb-4 space-y-2">
            {form.report.photos.map((photo, index) => (
              <PhotoRow
                key={photo.id}
                photo={photo}
                isFirst={index === 0}
                isLast={index === form.report.photos.length - 1}
                onCaptionChange={(caption) => form.updateCaption(photo.id, caption)}
                onSizeChange={(size) => form.updateSize(photo.id, size)}
                onMoveUp={() => form.movePhoto(photo.id, "up")}
                onMoveDown={() => form.movePhoto(photo.id, "down")}
                onRemove={() => form.removePhoto(photo.id)}
              />
            ))}
          </div>
          <Button type="button" variant="outline" onClick={form.removeAllPhotos} className="mb-6">
            Remover todas
          </Button>
        </>
      )}

      {form.saveError && <p className="mb-4 text-sm text-red-600">{form.saveError}</p>}
      {downloadError && <p className="mb-4 text-sm text-red-600">{downloadError}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={form.saveDraft}>
          Salvar rascunho
        </Button>
        <ShimmerButton
          onClick={handleGeneratePdf}
          disabled={isGenerating || form.report.photos.length === 0}
          background="#1B3A6B"
        >
          {isGenerating ? "Gerando PDF…" : "Gerar PDF"}
        </ShimmerButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- NewLaudo.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/NewLaudo.tsx src/pages/__tests__/NewLaudo.test.tsx
git commit -m "feat: single-screen photo upload, remove the 6-step wizard"
```

---

## Task 9: LaudoListItem

**Files:**
- Modify: `src/components/laudo/LaudoListItem.tsx`
- Test: `src/components/laudo/__tests__/LaudoListItem.test.tsx`

**Interfaces:**
- Consumes: `PhotoReport` (Task 1), `downloadLaudoPdf` (Task 5).
- Produces: `LaudoListItem` with the same props shape `{ laudo: PhotoReport, onDelete }`. Tasks 10 and 11 (Dashboard, LaudoList) render this unchanged.

- [ ] **Step 1: Write the failing tests**

Replace `src/components/laudo/__tests__/LaudoListItem.test.tsx` entirely:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { LaudoListItem } from "@/components/laudo/LaudoListItem";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: "report-1",
    label: "Vistoria Rua das Flores",
    photos: [],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("LaudoListItem", () => {
  it("shows the label when present", () => {
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport({ label: "Vistoria Rua das Flores" })} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Vistoria Rua das Flores")).toBeInTheDocument();
  });

  it("falls back to a photo-count title when there is no label", () => {
    render(
      <MemoryRouter>
        <LaudoListItem
          laudo={makeReport({ label: undefined, photos: [{ id: "p1", dataUrl: "d", caption: "", order: 1, size: "quarter" }] })}
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Registro fotográfico — 1 foto(s)")).toBeInTheDocument();
  });

  it("shows an 'Editar laudo' link to the resume-editing route for a draft", () => {
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport({ status: "draft" })} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    const editLink = screen.getByRole("link", { name: /editar laudo/i });
    expect(editLink).toHaveAttribute("href", "/novo-laudo/report-1");
  });

  it("does not show an edit link for a completed laudo", () => {
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport({ status: "completed" })} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: /editar laudo/i })).not.toBeInTheDocument();
  });

  it("shows a loading label and disables the download button while generating, preventing a double click", async () => {
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: /baixar pdf/i });
    fireEvent.click(button);
    fireEvent.click(button); // simulate an impatient double click

    await waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(1));
  });

  it("shows an error message when the PDF download fails", async () => {
    vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {
      throw new Error("boom");
    });
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));

    await waitFor(() => expect(screen.getByText(/falha ao gerar o pdf/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- LaudoListItem.test.tsx`
Expected: FAIL — the component still types against `LaudoData` and renders `laudo.client.name`.

- [ ] **Step 3: Rewrite LaudoListItem.tsx**

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Download, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PhotoReport } from "@/types/laudo";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";

export interface LaudoListItemProps {
  laudo: PhotoReport;
  onDelete: (id: string) => void;
}

export function LaudoListItem({ laudo, onDelete }: LaudoListItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  function handleDownload() {
    if (isGenerating) return;
    setDownloadError(null);
    setIsGenerating(true);
    setTimeout(() => {
      try {
        downloadLaudoPdf(laudo);
      } catch {
        setDownloadError("Falha ao gerar o PDF. Tente novamente.");
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  }

  const title = laudo.label || `Registro fotográfico — ${laudo.photos.length} foto(s)`;

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-800">{title}</p>
          <p className="text-sm text-slate-500">
            {laudo.photos.length} foto(s) — {new Date(laudo.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={laudo.status === "completed" ? "bg-green-600" : "bg-amber-500"}>
            {laudo.status === "completed" ? "Concluído" : "Rascunho"}
          </Badge>

          {laudo.status === "draft" && (
            <Link
              to={`/novo-laudo/${laudo.id}`}
              aria-label="Editar laudo"
              className="text-slate-400 hover:text-karrer-blue"
            >
              <Pencil size={18} />
            </Link>
          )}
          <Link to={`/laudos/${laudo.id}`} aria-label="Ver laudo" className="text-slate-400 hover:text-karrer-blue">
            <Eye size={18} />
          </Link>
          <button
            type="button"
            aria-label={isGenerating ? "Gerando PDF" : "Baixar PDF"}
            onClick={handleDownload}
            disabled={isGenerating}
            className="text-slate-400 hover:text-karrer-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>
          <button
            type="button"
            aria-label="Excluir laudo"
            onClick={() => setConfirmOpen(true)}
            className="text-slate-400 hover:text-red-600"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {downloadError && <p className="mt-2 text-xs text-red-600">{downloadError}</p>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir laudo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onDelete(laudo.id);
                setConfirmOpen(false);
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- LaudoListItem.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/laudo/LaudoListItem.tsx src/components/laudo/__tests__/LaudoListItem.test.tsx
git commit -m "feat: show label/photo-count instead of client name in the list item"
```

---

## Task 10: Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Test: `src/pages/__tests__/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `PhotoReport` (Task 1), `getLaudos`/`deleteLaudo` (Task 2), `LaudoListItem` (Task 9, unchanged props shape).

`Dashboard.tsx` itself never reads `client`/`property`/`type` directly — it only reads `status`/`updatedAt` and delegates row rendering to `LaudoListItem`. The only change is the type import.

- [ ] **Step 1: Write the failing tests**

Replace `src/pages/__tests__/Dashboard.test.tsx` entirely:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Dashboard from "@/pages/Dashboard";
import { saveLaudo } from "@/lib/storage";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: crypto.randomUUID(),
    label: "Registro 1",
    photos: [],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("Dashboard", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state when there are no laudos", () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });

  it("shows correct stat counts and the recent laudo list", () => {
    saveLaudo(makeReport({ id: "1", status: "completed" }));
    saveLaudo(makeReport({ id: "2", status: "draft" }));
    saveLaudo(makeReport({ id: "3", status: "draft" }));

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(screen.getByTestId("stat-total")).toHaveTextContent("3");
    expect(screen.getByTestId("stat-completed")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-drafts")).toHaveTextContent("2");
    expect(screen.getAllByText("Registro 1")).toHaveLength(3);
  });

  it("downloads the PDF when clicking the download action", async () => {
    saveLaudo(makeReport({ id: "1" }));
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    await waitFor(() => expect(downloadSpy).toHaveBeenCalled());
  });

  it("deletes a laudo after confirming the dialog", () => {
    saveLaudo(makeReport({ id: "1" }));
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /excluir laudo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- Dashboard.test.tsx`
Expected: FAIL — `Dashboard.tsx` imports `LaudoData`, which no longer exists.

- [ ] **Step 3: Update the type import**

In `src/pages/Dashboard.tsx`, change:

```ts
import type { LaudoData } from "@/types/laudo";
```

to:

```ts
import type { PhotoReport } from "@/types/laudo";
```

and change the one usage `useState<LaudoData[]>([])` to `useState<PhotoReport[]>([])`. Nothing else in the file changes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- Dashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/__tests__/Dashboard.test.tsx
git commit -m "feat: retype Dashboard for PhotoReport"
```

---

## Task 11: LaudoList

**Files:**
- Modify: `src/pages/LaudoList.tsx`
- Test: `src/pages/__tests__/LaudoList.test.tsx`

**Interfaces:**
- Consumes: `PhotoReport` (Task 1), `getLaudos`/`deleteLaudo` (Task 2), `LaudoListItem` (Task 9).

- [ ] **Step 1: Write the failing tests**

Create `src/pages/__tests__/LaudoList.test.tsx` (there was no prior test file matching this exact behavior beyond the smoke-level rendering — write it fresh):

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LaudoList from "@/pages/LaudoList";
import { saveLaudo } from "@/lib/storage";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: crypto.randomUUID(),
    label: "Vistoria Rua X",
    photos: [],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("LaudoList", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state when there are no laudos", () => {
    render(<MemoryRouter><LaudoList /></MemoryRouter>);
    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });

  it("filters by label", () => {
    saveLaudo(makeReport({ label: "Vistoria Rua das Flores" }));
    saveLaudo(makeReport({ label: "Laudo Técnico Predial" }));
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "flores" } });

    expect(screen.getByText("Vistoria Rua das Flores")).toBeInTheDocument();
    expect(screen.queryByText("Laudo Técnico Predial")).not.toBeInTheDocument();
  });

  it("shows a not-found message when the search matches nothing", () => {
    saveLaudo(makeReport({ label: "Vistoria Rua das Flores" }));
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "zzz" } });

    expect(screen.getByText(/nenhum laudo encontrado/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- LaudoList.test.tsx`
Expected: FAIL — the current filter reads `l.client.name`/`l.property.address`, which no longer exist.

- [ ] **Step 3: Update LaudoList.tsx**

```tsx
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { SparklesText } from "@/components/ui/sparkles-text";
import { LaudoListItem } from "@/components/laudo/LaudoListItem";
import type { PhotoReport } from "@/types/laudo";
import { getLaudos, deleteLaudo } from "@/lib/storage";

export default function LaudoList() {
  const [laudos, setLaudos] = useState<PhotoReport[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLaudos(getLaudos());
  }, []);

  function handleDelete(id: string) {
    deleteLaudo(id);
    setLaudos(getLaudos());
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return laudos;
    return laudos.filter((l) => (l.label ?? "").toLowerCase().includes(q));
  }, [laudos, query]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-karrer-navy">Meus Laudos</h1>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por apelido"
        className="mb-6"
        aria-label="Buscar laudos"
      />

      {laudos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
          <SparklesText className="text-lg text-karrer-navy">Crie seu primeiro laudo</SparklesText>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum laudo encontrado para "{query}".</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((laudo) => (
            <LaudoListItem key={laudo.id} laudo={laudo} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- LaudoList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/LaudoList.tsx src/pages/__tests__/LaudoList.test.tsx
git commit -m "feat: search laudos by label instead of client/address/type"
```

---

## Task 12: LaudoDetail

**Files:**
- Modify: `src/pages/LaudoDetail.tsx`
- Test: `src/pages/__tests__/LaudoDetail.test.tsx`

**Interfaces:**
- Consumes: `PhotoReport` (Task 1), `getLaudo`/`deleteLaudo` (Task 2), `downloadLaudoPdf` (Task 5).

The "Editar notas" flow disappears entirely — `PhotoReport` has no notes field, since Notas Técnicas was one of the removed sections.

- [ ] **Step 1: Write the failing tests**

Replace `src/pages/__tests__/LaudoDetail.test.tsx` entirely:

```tsx
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import LaudoDetail from "@/pages/LaudoDetail";
import { saveLaudo, getLaudo } from "@/lib/storage";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: "report-1",
    label: "Vistoria Rua Y",
    photos: [{ id: "p1", dataUrl: "data:1", caption: "Fachada", order: 1, size: "quarter" }],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    ...overrides,
  };
}

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/laudos/${id}`]}>
      <Routes>
        <Route path="/laudos/:id" element={<LaudoDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LaudoDetail", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("shows a not-found message for an unknown id", () => {
    renderDetail("does-not-exist");
    expect(screen.getByText(/laudo não encontrado/i)).toBeInTheDocument();
  });

  it("renders the report's label and photo list", () => {
    saveLaudo(makeReport());
    renderDetail("report-1");
    expect(screen.getByText("Vistoria Rua Y")).toBeInTheDocument();
    expect(screen.getByText("Fachada")).toBeInTheDocument();
  });

  it("falls back to a photo-count title when there is no label", () => {
    saveLaudo(makeReport({ label: undefined }));
    renderDetail("report-1");
    expect(screen.getByText("Registro fotográfico — 1 foto(s)")).toBeInTheDocument();
  });

  it("downloads the PDF when clicking Baixar PDF", async () => {
    saveLaudo(makeReport());
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    renderDetail("report-1");

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    await waitFor(() => expect(downloadSpy).toHaveBeenCalled());
  });

  it("shows an error and re-enables the button when the PDF download fails", async () => {
    saveLaudo(makeReport());
    vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {
      throw new Error("boom");
    });
    renderDetail("report-1");

    const button = screen.getByRole("button", { name: /baixar pdf/i });
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText(/não foi possível gerar o pdf/i)).toBeInTheDocument());
    expect(button).not.toBeDisabled();
  });

  it("deletes the laudo after confirming the dialog", () => {
    saveLaudo(makeReport());
    renderDetail("report-1");

    fireEvent.click(screen.getByRole("button", { name: /excluir laudo/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(getLaudo("report-1")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- LaudoDetail.test.tsx`
Expected: FAIL — the current page renders client/property/conclusion/notes, none of which exist on `PhotoReport`.

- [ ] **Step 3: Rewrite LaudoDetail.tsx**

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { PhotoReport } from "@/types/laudo";
import { getLaudo, deleteLaudo } from "@/lib/storage";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";

export default function LaudoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [laudo, setLaudo] = useState<PhotoReport | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (id) setLaudo(getLaudo(id));
  }, [id]);

  if (!laudo) {
    return <p className="text-sm text-slate-500">Laudo não encontrado.</p>;
  }

  function handleDelete() {
    deleteLaudo(laudo!.id);
    navigate("/laudos");
  }

  function handleDownload() {
    if (isGenerating) return;
    setDownloadError(null);
    setIsGenerating(true);
    setTimeout(() => {
      try {
        downloadLaudoPdf(laudo!);
      } catch {
        setDownloadError("Não foi possível gerar o PDF. Tente novamente.");
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  }

  const title = laudo.label || `Registro fotográfico — ${laudo.photos.length} foto(s)`;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-karrer-navy">{title}</h1>
        <div className="flex items-center gap-3">
          <Badge className={laudo.status === "completed" ? "bg-green-600" : "bg-amber-500"}>
            {laudo.status === "completed" ? "Concluído" : "Rascunho"}
          </Badge>
          {laudo.status === "draft" && (
            <Link to={`/novo-laudo/${laudo.id}`}>
              <Button type="button" variant="outline">
                Continuar editando
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Fotos ({laudo.photos.length})</h2>
        <div className="space-y-2">
          {laudo.photos.map((photo) => (
            <div key={photo.id} className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-2">
              <img src={photo.dataUrl} alt="" className="h-16 w-16 rounded-md object-cover" />
              <p className="text-sm text-slate-600">{photo.caption || "Sem legenda"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={handleDownload}
          disabled={isGenerating}
          className="bg-karrer-blue hover:bg-karrer-lightblue"
        >
          {isGenerating ? "Gerando PDF…" : "Baixar PDF"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)}>
          Excluir laudo
        </Button>
      </div>
      {downloadError && <p className="mt-2 text-sm text-red-600">{downloadError}</p>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir laudo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- LaudoDetail.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/LaudoDetail.tsx src/pages/__tests__/LaudoDetail.test.tsx
git commit -m "feat: simplify LaudoDetail to label + read-only photo list"
```

---

## Task 13: README

**Files:**
- Modify: `README.md`

No test — documentation only.

- [ ] **Step 1: Update the description paragraph**

Replace the first paragraph (lines 1–5) of `README.md`:

```markdown
# Sistema de Laudos Técnicos — Karrer Engenharia

Aplicação web 100% client-side para gerar o registro fotográfico de laudos
técnicos de engenharia: sobe fotos, escreve a legenda de cada uma, escolhe o
tamanho (1/4, 1/2 ou página inteira) e exporta um PDF com a identidade visual
da Karrer (faixa azul, fotos com legenda em caixa). O restante do laudo
(capa, dados do cliente, conclusão etc.) é montado separadamente — o PDF
gerado aqui é feito para ser unido a esse restante depois, por exemplo com o
iLovePDF. Histórico salvo em `localStorage`. Sem backend, sem banco de dados.
```

Everything else in the file (Rodar localmente, Como gerar o hash da senha, Trocar a senha, Deploy no Vercel, Testes) stays unchanged — none of it references the removed sections.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: describe the photo-report tool instead of the full laudo wizard"
```

---

## Task 14: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npm run build` (runs `tsc -b && vite build`)
Expected: succeeds with no type errors. This is what catches any straggling reference to `LaudoData`/`ClientData`/`PropertyData`/`LAUDO_TYPE_LABELS` outside the files this plan touched (e.g. `Sidebar.tsx`, `App.tsx` — neither is expected to reference them, but this is the real check, not an assumption).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Full test suite**

Run: `npm run test`
Expected: every test passes — no leftover references to deleted files, no stale snapshots.

- [ ] **Step 4: Manual check in a real browser**

Run: `npm run dev`, then open the app:
- Log in (or confirm `.env` has `VITE_APP_USERNAME`/`VITE_APP_PASSWORD_HASH` set locally).
- Go to "Novo Laudo": confirm it's the single-screen upload tool (no stepper), upload 5+ real photos, set one to "1/2" and one to "Página inteira", write captions, click "Gerar PDF".
- Open the downloaded PDF and visually confirm: no header bands, solid blue footer band on every page, bordered photo+caption grid, correct quarter/half/full sizing, title only on page 1.
- Go to "Meus Laudos": confirm the saved report shows with its label (or photo-count fallback), search by label works, download/delete work.

- [ ] **Step 5: Commit (only if Step 4 required fixes)**

If the manual check surfaces a real defect, fix it with its own test, then:

```bash
git add -A
git commit -m "fix: <describe the specific defect found during manual verification>"
```

If nothing needed fixing, this task produces no commit — it's a gate, not a deliverable.
