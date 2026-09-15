import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawClientSection } from "@/lib/pdf/sections/client";
import { drawPropertySection } from "@/lib/pdf/sections/property";
import { drawConclusionSection } from "@/lib/pdf/sections/conclusion";
import type { ClientData, PropertyData } from "@/types/laudo";

const client: ClientData = {
  name: "Maria Souza",
  document: "123.456.789-00",
  address: "Rua A, 1",
  email: "maria@ex.com",
};
const property: PropertyData = {
  address: "Rua B, 2",
  neighborhood: "Centro",
  city: "Balneário Camboriú",
  state: "SC",
  inspectionDate: "2026-09-14",
  artNumber: "ART-001",
  description: "Casa térrea de alvenaria.",
};

describe("drawClientSection", () => {
  it("adds a page and writes the client's fields", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawClientSection(doc, client, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith("Maria Souza", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("123.456.789-00", expect.any(Number), expect.any(Number));
  });
});

describe("drawPropertySection", () => {
  it("adds a page and writes the property's fields and description", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawPropertySection(doc, property, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith("ART-001", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("Balneário Camboriú/SC", expect.any(Number), expect.any(Number));
  });
});

describe("drawConclusionSection", () => {
  it("adds a page and writes the conclusion text", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawConclusionSection(doc, "Não foram identificados riscos.", cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith(
      expect.arrayContaining(["Não foram identificados riscos."]),
      expect.any(Number),
      expect.any(Number),
    );
  });
});
