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

    // Single-line captions are drawn as a plain string per call (not an
    // array) — see the "vertically centers" tests below for why drawCell
    // calls doc.text() once per line instead of once with an array.
    expect(textSpy).toHaveBeenCalledWith(
      "1 - Fachada",
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: "center" }),
    );
    expect(textSpy).toHaveBeenCalledWith(
      "2 - Sem legenda",
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

  it("a lone full-size photo does not leave a trailing blank page", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const cursor = { pageNumber: 1 };

    drawPhotosSection(doc, [makePhoto({ id: "1", order: 1, size: "full" })], cursor);

    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("a quarter photo followed by a full photo produces exactly 2 pages, no trailing blank", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const cursor = { pageNumber: 1 };

    drawPhotosSection(
      doc,
      [
        makePhoto({ id: "1", order: 1, size: "quarter" }),
        makePhoto({ id: "2", order: 2, size: "full" }),
      ],
      cursor,
    );

    expect(doc.getNumberOfPages()).toBe(2);
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

  it("wraps a caption spanning 2 sentences onto 2 centered lines", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };
    const caption = "Trinca diagonal na parede externa. Necessita reparo estrutural imediato.";

    drawPhotosSection(
      doc,
      [makePhoto({ id: "1", order: 1, caption, size: "quarter" })],
      cursor,
    );

    // Compute what doc.splitTextToSize produces for this caption at the
    // quarter-cell's text width, using the same font/size drawCell sets.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const quarterCellWidth = (((210 - 15 * 2) - 4) / 2) - 4;
    const expectedLines = doc.splitTextToSize(`1 - ${caption}`, quarterCellWidth);

    expect(expectedLines.length).toBe(2);
    expect(expectedLines.length).toBeLessThanOrEqual(3);
    expectedLines.forEach((line: string) => {
      expect(textSpy).toHaveBeenCalledWith(
        line,
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: "center", baseline: "middle" }),
      );
    });
  });

  it("truncates a very long caption to MAX_CAPTION_LINES lines, ending the last line with an ellipsis", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    stubImageProps(doc);
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };
    const longCaption =
      "Trinca diagonal extensa observada na fachada principal do imóvel, com abertura " +
      "visível de aproximadamente três milímetros, estendendo-se desde a base da esquadria " +
      "até próximo ao encontro com a viga superior, exigindo avaliação estrutural detalhada.";
    expect(longCaption.length).toBeGreaterThan(200);

    drawPhotosSection(
      doc,
      [makePhoto({ id: "1", order: 1, caption: longCaption, size: "quarter" })],
      cursor,
    );

    // Only one photo is drawn, so every doc.text() call belongs to its caption.
    expect(textSpy.mock.calls).toHaveLength(3);
    const lastLineText = textSpy.mock.calls[2][0] as string;
    expect(lastLineText.endsWith("…")).toBe(true);
  });

  it("does nothing for an empty photo list", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor = { pageNumber: 1 };

    expect(() => drawPhotosSection(doc, [], cursor)).not.toThrow();
    expect(doc.getNumberOfPages()).toBe(1);
    expect(cursor.pageNumber).toBe(1);
  });
});
