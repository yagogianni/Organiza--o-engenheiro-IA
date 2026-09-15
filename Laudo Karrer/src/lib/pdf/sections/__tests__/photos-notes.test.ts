import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { newPage } from "@/lib/pdf/pageHelpers";
import { drawPhotosSection } from "@/lib/pdf/sections/photos";
import { drawNotesSection } from "@/lib/pdf/sections/notes";
import type { PhotoItem } from "@/types/laudo";

describe("newPage", () => {
  it("adds a page, increments the cursor, and draws header/footer without throwing", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor = { pageNumber: 1 };

    expect(() => newPage(doc, "Conclusão", cursor)).not.toThrow();
    expect(cursor.pageNumber).toBe(2);
    expect(doc.getNumberOfPages()).toBe(2);
  });
});

describe("drawPhotosSection", () => {
  const photos: PhotoItem[] = [
    { id: "1", dataUrl: "data:image/jpeg;base64,FAKE1", caption: "Fachada", order: 1 },
    { id: "2", dataUrl: "data:image/jpeg;base64,FAKE2", caption: "Fundos", order: 2 },
    { id: "3", dataUrl: "data:image/jpeg;base64,FAKE3", caption: "", order: 3 },
  ];

  it("lays out photos 2 per row and numbers captions as 4.N — legenda", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawPhotosSection(doc, photos, cursor);

    expect(doc.addImage).toHaveBeenCalledTimes(3);
    expect(textSpy).toHaveBeenCalledWith("4.1 — Fachada", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("4.2 — Fundos", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("4.3 — Sem legenda", expect.any(Number), expect.any(Number));
    expect(cursor.pageNumber).toBe(2);
  });
});

describe("drawNotesSection", () => {
  it("adds a page and draws the notes box when notes are present", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor = { pageNumber: 1 };

    drawNotesSection(doc, "Medição feita com trena a laser.", cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(doc.getNumberOfPages()).toBe(2);
  });

  it("does nothing when notes are empty or undefined", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor = { pageNumber: 1 };

    drawNotesSection(doc, "", cursor);
    drawNotesSection(doc, undefined, cursor);

    expect(cursor.pageNumber).toBe(1);
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
