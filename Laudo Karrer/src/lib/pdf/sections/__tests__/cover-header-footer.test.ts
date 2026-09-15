import { jsPDF } from "jspdf";
import { drawCover } from "@/lib/pdf/sections/cover";
import { drawHeader } from "@/lib/pdf/sections/header";
import { drawFooter } from "@/lib/pdf/sections/footer";
import type { LaudoData } from "@/types/laudo";

const sampleLaudo: LaudoData = {
  id: "1",
  type: "vistoria_cautelar",
  client: { name: "Cliente Teste", document: "123.456.789-00", address: "Rua A, 1" },
  property: {
    address: "Rua B, 2",
    neighborhood: "Centro",
    city: "Balneário Camboriú",
    state: "SC",
    inspectionDate: "2026-09-14",
    artNumber: "ART-001",
    description: "Casa térrea",
  },
  photos: [],
  conclusion: "Conclusão de teste",
  status: "draft",
  createdAt: "2026-09-14T10:00:00.000Z",
  updatedAt: "2026-09-14T10:00:00.000Z",
};

describe("drawCover", () => {
  it("draws the cover page without throwing and produces non-empty output", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(() => drawCover(doc, sampleLaudo)).not.toThrow();
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(0);
  });
});

describe("drawHeader", () => {
  it("draws the section title band without throwing", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(() => drawHeader(doc, "Identificação do Solicitante", 2)).not.toThrow();
  });
});

describe("drawFooter", () => {
  it("draws the engineer footer line without throwing", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(() => drawFooter(doc)).not.toThrow();
  });
});
