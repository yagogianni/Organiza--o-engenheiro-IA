import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawInstrumentsSection } from "@/lib/pdf/sections/instruments";
import { drawGlossarySection } from "@/lib/pdf/sections/glossary";
import { drawReferencesSection } from "@/lib/pdf/sections/references";
import { GLOSSARY } from "@/lib/pdf/content/glossary";

describe("drawInstrumentsSection", () => {
  it("adds a page and lists all instruments as bullets", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawInstrumentsSection(doc, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith(
      expect.arrayContaining(["• Fissurômetro"]),
      expect.any(Number),
      expect.any(Number),
    );
  });
});

describe("drawReferencesSection", () => {
  it("adds a page and lists all references as bullets", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawReferencesSection(doc, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith(
      expect.arrayContaining(["• ABNT NBR 6118"]),
      expect.any(Number),
      expect.any(Number),
    );
  });
});

describe("drawGlossarySection", () => {
  it("paginates across the full 63-term glossary and writes the first and last terms", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawGlossarySection(doc, cursor);

    expect(cursor.pageNumber).toBeGreaterThan(2); // 63 long definitions overflow more than one page
    expect(textSpy).toHaveBeenCalledWith(GLOSSARY[0].term, expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith(
      GLOSSARY[GLOSSARY.length - 1].term,
      expect.any(Number),
      expect.any(Number),
    );
  });
});
