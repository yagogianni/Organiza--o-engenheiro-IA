import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { computeGridFrame, drawPhotosSection, fitCaption } from "@/lib/pdf/sections/photos";
import { DEFAULT_PDF_OPTIONS, PDF_LAYOUT } from "@/lib/pdf/constants";
import type { PhotoItem } from "@/types/laudo";

function newDoc() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  vi.spyOn(doc, "getImageProperties").mockReturnValue({
    width: 1600,
    height: 1200,
  } as ReturnType<jsPDF["getImageProperties"]>);
  const addImageSpy = vi.spyOn(doc, "addImage").mockReturnValue(doc);
  return { doc, addImageSpy };
}

function makePhoto(overrides: Partial<PhotoItem> & { id: string; order: number }): PhotoItem {
  return {
    dataUrl: `data:image/jpeg;base64,FAKE${overrides.order}`,
    caption: "",
    size: "quarter",
    ...overrides,
  };
}

type AddImageSpy = ReturnType<typeof newDoc>["addImageSpy"];

/** x/y of each addImage call, in call order. */
function imagePlacements(_doc: jsPDF, addImageSpy: AddImageSpy) {
  return addImageSpy.mock.calls.map((call: unknown[]) => ({ x: call[2] as number, y: call[3] as number }));
}

const LONG_CAPTION =
  "Trinca diagonal extensa observada na fachada principal do imóvel, com abertura visível de " +
  "aproximadamente três milímetros, estendendo-se desde a base da esquadria até próximo ao " +
  "encontro com a viga superior, exigindo avaliação estrutural detalhada e acompanhamento " +
  "periódico com fissurômetro para verificar se a abertura está ativa.";

describe("drawPhotosSection", () => {
  it("fills the 2x2 grid row by row: 1 2 on top, 3 4 below", () => {
    const { doc, addImageSpy } = newDoc();
    const photos = Array.from({ length: 4 }, (_, i) => makePhoto({ id: `${i}`, order: i + 1 }));

    drawPhotosSection(doc, photos, { pageNumber: 1 });

    const [p1, p2, p3, p4] = imagePlacements(doc, addImageSpy);
    // 1 and 2 share the top row, 2 to the right of 1
    expect(p1.y).toBeCloseTo(p2.y);
    expect(p2.x).toBeGreaterThan(p1.x);
    // 3 and 4 share the bottom row, below 1/2, 3 under 1 and 4 under 2
    expect(p3.y).toBeCloseTo(p4.y);
    expect(p3.y).toBeGreaterThan(p1.y);
    expect(p3.x).toBeCloseTo(p1.x);
    expect(p4.x).toBeCloseTo(p2.x);
  });

  it("starts a new page every 4 quarter photos, repeating the 1 2 / 3 4 pattern", () => {
    const { doc, addImageSpy } = newDoc();
    const cursor = { pageNumber: 1 };
    const photos = Array.from({ length: 10 }, (_, i) => makePhoto({ id: `${i}`, order: i + 1 }));

    drawPhotosSection(doc, photos, cursor);

    expect(doc.getNumberOfPages()).toBe(3);
    expect(cursor.pageNumber).toBe(3);
    const placements = imagePlacements(doc, addImageSpy);
    // photo 5 sits where photo 1 sat, 6 where 2 sat, and so on
    for (let i = 4; i < 10; i += 1) {
      expect(placements[i].x).toBeCloseTo(placements[i % 4].x);
      expect(placements[i].y).toBeCloseTo(placements[i % 4].y);
    }
  });

  it("numbers captions in upload order as 'N - legenda', falling back to 'Sem legenda'", () => {
    const { doc } = newDoc();
    const textSpy = vi.spyOn(doc, "text");

    drawPhotosSection(
      doc,
      [
        makePhoto({ id: "a", order: 1, caption: "Fachada" }),
        makePhoto({ id: "b", order: 2, caption: "   " }),
        makePhoto({ id: "c", order: 3, caption: "Fundos" }),
      ],
      { pageNumber: 1 },
    );

    const texts = textSpy.mock.calls.map((call) => call[0]);
    expect(texts).toEqual(["1 - Fachada", "2 - Sem legenda", "3 - Fundos"]);
  });

  it("keeps the photo's proportions (no distortion) for landscape, portrait and square images", () => {
    for (const [w, h] of [
      [1600, 900],
      [900, 1600],
      [1000, 1000],
    ]) {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      vi.spyOn(doc, "getImageProperties").mockReturnValue({ width: w, height: h } as ReturnType<
        jsPDF["getImageProperties"]
      >);
      const addImageSpy = vi.spyOn(doc, "addImage").mockReturnValue(doc);

      drawPhotosSection(doc, [makePhoto({ id: "1", order: 1 })], { pageNumber: 1 });

      const [, , , , drawW, drawH] = addImageSpy.mock.calls[0] as unknown as number[];
      expect(drawW / drawH).toBeCloseTo(w / h, 5);
      expect(drawW).toBeLessThanOrEqual(PDF_LAYOUT.grid.cellWidth + 0.001);
    }
  });

  it("puts two half photos side by side on one page", () => {
    const { doc } = newDoc();
    drawPhotosSection(
      doc,
      [makePhoto({ id: "1", order: 1, size: "half" }), makePhoto({ id: "2", order: 2, size: "half" })],
      { pageNumber: 1 },
    );
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("gives a full-size photo its own page, before and after", () => {
    const { doc } = newDoc();
    drawPhotosSection(
      doc,
      [
        makePhoto({ id: "1", order: 1 }),
        makePhoto({ id: "2", order: 2, size: "full" }),
        makePhoto({ id: "3", order: 3 }),
      ],
      { pageNumber: 1 },
    );
    expect(doc.getNumberOfPages()).toBe(3);
  });

  it("a lone full-size photo does not leave a trailing blank page", () => {
    const { doc } = newDoc();
    drawPhotosSection(doc, [makePhoto({ id: "1", order: 1, size: "full" })], { pageNumber: 1 });
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("backfills a free quarter slot after a half photo takes the right column", () => {
    const { doc, addImageSpy } = newDoc();
    drawPhotosSection(
      doc,
      [
        makePhoto({ id: "1", order: 1 }),
        makePhoto({ id: "2", order: 2, size: "half" }),
        makePhoto({ id: "3", order: 3 }),
      ],
      { pageNumber: 1 },
    );
    expect(doc.getNumberOfPages()).toBe(1);
    const [p1, , p3] = imagePlacements(doc, addImageSpy);
    expect(p3.x).toBeCloseTo(p1.x); // bottom-left, under photo 1
    expect(p3.y).toBeGreaterThan(p1.y);
  });

  it("treats a photo with a missing size as quarter (legacy data has no size field)", () => {
    const { doc } = newDoc();
    const legacyPhoto = { id: "1", order: 1, dataUrl: "data:image/jpeg;base64,FAKE", caption: "" } as PhotoItem;
    drawPhotosSection(doc, [legacyPhoto], { pageNumber: 1 });
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("draws a 5-line caption in full, inside its cell, without truncating", () => {
    const { doc } = newDoc();
    const textSpy = vi.spyOn(doc, "text");
    const rectSpy = vi.spyOn(doc, "rect");

    drawPhotosSection(doc, [makePhoto({ id: "1", order: 1, caption: LONG_CAPTION })], { pageNumber: 1 });

    const lines = textSpy.mock.calls.map((call) => call[0] as string);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines.join(" ").replace(/\s+/g, " ")).toBe(`1 - ${LONG_CAPTION}`);
    expect(lines.some((l) => l.endsWith("…"))).toBe(false);

    // photo box + caption box stack to exactly the cell height
    const [photoBox, captionBox] = rectSpy.mock.calls.map((call) => call.slice(0, 4) as number[]);
    const frame = computeGridFrame(DEFAULT_PDF_OPTIONS);
    expect(photoBox[3] + captionBox[3]).toBeCloseTo(frame.cellHeight);
    expect(captionBox[3]).toBeGreaterThanOrEqual(PDF_LAYOUT.grid.captionHeight);

    // every caption line sits inside the caption box
    textSpy.mock.calls.forEach((call) => {
      const y = call[2] as number;
      expect(y).toBeGreaterThan(captionBox[1]);
      expect(y).toBeLessThan(captionBox[1] + captionBox[3]);
    });
  });

  it("only cuts a caption (with '…') when it exceeds the maximum caption box", () => {
    const { doc } = newDoc();
    const textSpy = vi.spyOn(doc, "text");
    const absurd = Array.from({ length: 12 }, () => LONG_CAPTION).join(" ");

    drawPhotosSection(doc, [makePhoto({ id: "1", order: 1, caption: absurd })], { pageNumber: 1 });

    const last = textSpy.mock.calls.at(-1)![0] as string;
    expect(last.endsWith("…")).toBe(true);
  });

  it("side mode: photo on the left (~60%) and caption box on the right (~40%) of the cell", () => {
    const { doc, addImageSpy } = newDoc();
    const rectSpy = vi.spyOn(doc, "rect");
    const textSpy = vi.spyOn(doc, "text");

    drawPhotosSection(
      doc,
      [makePhoto({ id: "1", order: 1, caption: LONG_CAPTION })],
      { pageNumber: 1 },
      DEFAULT_PDF_OPTIONS,
      "side",
    );

    const [photoBox, captionBox] = rectSpy.mock.calls.map((call) => call.slice(0, 4) as number[]);
    const cellWidth = PDF_LAYOUT.grid.cellWidth;
    expect(photoBox[2]).toBeCloseTo(cellWidth * 0.6);
    expect(captionBox[2]).toBeCloseTo(cellWidth * 0.4);
    expect(captionBox[0]).toBeCloseTo(photoBox[0] + photoBox[2]);
    expect(captionBox[3]).toBeCloseTo(photoBox[3]);
    expect(addImageSpy).toHaveBeenCalledTimes(1);
    textSpy.mock.calls.forEach((call) => {
      expect(call[3]).toEqual(expect.objectContaining({ align: "left" }));
      expect(call[1] as number).toBeGreaterThan(captionBox[0]);
    });
  });

  it("does nothing for an empty photo list", () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const cursor = { pageNumber: 1 };
    expect(() => drawPhotosSection(doc, [], cursor)).not.toThrow();
    expect(doc.getNumberOfPages()).toBe(1);
  });
});

describe("computeGridFrame", () => {
  it("uses the configured measures with the footer, centered horizontally and above the footer", () => {
    const frame = computeGridFrame(DEFAULT_PDF_OPTIONS);
    const { page, grid, footer } = PDF_LAYOUT;
    expect(frame.cellWidth).toBe(grid.cellWidth);
    expect(frame.cellHeight).toBe(grid.cellHeight);
    expect(frame.x).toBeCloseTo((page.width - frame.width) / 2);
    expect(frame.y + frame.height).toBeLessThanOrEqual(footer.top);
  });

  it("grows the cells into the freed space when the footer is off, still centered", () => {
    const withFooter = computeGridFrame(DEFAULT_PDF_OPTIONS);
    const withoutFooter = computeGridFrame({ ...DEFAULT_PDF_OPTIONS, includeFooter: false });
    expect(withoutFooter.cellHeight).toBeGreaterThan(withFooter.cellHeight);
    expect(withoutFooter.x).toBeCloseTo(withFooter.x);
    expect(withoutFooter.y + withoutFooter.height).toBeCloseTo(
      PDF_LAYOUT.page.height - PDF_LAYOUT.bottomMarginWithoutFooter,
    );
  });
});

describe("fitCaption", () => {
  it("keeps the default font and box for a short caption", () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const fitted = fitCaption(doc, "1 - Fachada", 250, 46, 150);
    expect(fitted.fontSize).toBe(PDF_LAYOUT.caption.fontSize);
    expect(fitted.boxHeight).toBe(46);
    expect(fitted.lines).toEqual(["1 - Fachada"]);
  });

  it("shrinks the font first, then grows the box, for a long caption", () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const fitted = fitCaption(doc, `1 - ${LONG_CAPTION}`, 250, 46, 150);
    expect(fitted.fontSize).toBe(PDF_LAYOUT.caption.minFontSize);
    expect(fitted.boxHeight).toBeGreaterThan(46);
    expect(fitted.boxHeight).toBeLessThanOrEqual(150);
  });
});
