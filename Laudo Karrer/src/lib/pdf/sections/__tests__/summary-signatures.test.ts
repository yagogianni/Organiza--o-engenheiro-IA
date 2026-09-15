import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawSummarySection } from "@/lib/pdf/sections/summary";
import { drawSignaturesSection } from "@/lib/pdf/sections/signatures";
import type { LaudoData } from "@/types/laudo";

describe("drawSummarySection", () => {
  it("draws each entry's title and page number without adding a new page", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const pagesBefore = doc.getNumberOfPages();

    drawSummarySection(
      doc,
      [
        { title: "Identificação do Solicitante", page: 3 },
        { title: "Conclusão", page: 12 },
      ],
      1,
    );

    expect(doc.getNumberOfPages()).toBe(pagesBefore);
    expect(textSpy).toHaveBeenCalledWith(
      "Identificação do Solicitante",
      expect.any(Number),
      expect.any(Number),
    );
    expect(textSpy).toHaveBeenCalledWith(
      "12",
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: "right" }),
    );
  });
});

const sampleLaudo: LaudoData = {
  id: "1",
  type: "vistoria_cautelar",
  client: { name: "Maria Souza", document: "", address: "" },
  property: {
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    inspectionDate: "",
    artNumber: "",
    description: "",
  },
  photos: [],
  conclusion: "",
  status: "draft",
  createdAt: "",
  updatedAt: "",
};

describe("drawSignaturesSection", () => {
  it("adds a page and draws both signature lines with names", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawSignaturesSection(doc, sampleLaudo, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith("Maria Souza", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith(
      "Bernardo Sieverdt Karrer",
      expect.any(Number),
      expect.any(Number),
    );
    expect(textSpy).toHaveBeenCalledWith("CREA/SC: 199052-0", expect.any(Number), expect.any(Number));
  });
});
