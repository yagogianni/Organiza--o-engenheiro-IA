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
