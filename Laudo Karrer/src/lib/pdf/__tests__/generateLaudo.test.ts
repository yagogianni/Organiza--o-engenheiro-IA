import { vi } from "vitest";
import { generateLaudoPdf, downloadLaudoPdf } from "@/lib/pdf/generateLaudo";
import type { LaudoData } from "@/types/laudo";

// jsPDF v4 assigns its core drawing methods (text, save, addPage, setPage, ...)
// as fresh closures created *inside the constructor* of each instance. Unlike
// plugin methods (addImage, which is mixed in via the shared, prototype-reachable
// jsPDF.API object), text/save are never reachable via jsPDF.prototype — confirmed
// empirically: `'text' in jsPDF.prototype` is false even after instances exist,
// and two instances' `.text` functions are `!==` each other. Because
// generateLaudoPdf()/downloadLaudoPdf() build their own internal jsPDF instance
// and don't expose it, there's no handle to spy on after construction either.
// So instead of `vi.spyOn(jsPDF.prototype, ...)` (which throws: "the property is
// not defined on the object"), we wrap the constructor itself so every instance
// is spied the moment it's created, and expose the most recently created
// instance's spies for the tests to assert against. This changes only how the
// spies are wired up — every assertion below is unchanged from the original.
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
      // Cast to a plain method-bag so vitest's `this`-conditional spyOn
      // overloads (which trip up on `this` inside a class constructor body)
      // resolve cleanly; the underlying object is still the real instance.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = this as any;
      lastTextSpy = vi.spyOn(instance, "text");
      lastSaveSpy = vi.spyOn(instance, "save").mockImplementation(() => {});
      lastAddImageSpy = vi.spyOn(instance, "addImage").mockReturnValue(instance);
    }
  }

  return { ...actual, jsPDF: SpiedJsPDF };
});

const sampleLaudo: LaudoData = {
  id: "1",
  type: "vistoria_cautelar",
  client: { name: "Maria Souza", document: "123.456.789-00", address: "Rua A, 1" },
  property: {
    address: "Rua B, 2",
    neighborhood: "Centro",
    city: "Balneário Camboriú",
    state: "SC",
    inspectionDate: "2026-09-14",
    artNumber: "ART-001",
    description: "Casa térrea.",
  },
  photos: [
    { id: "p1", dataUrl: "data:image/jpeg;base64,FAKE1", caption: "Fachada", order: 1 },
    { id: "p2", dataUrl: "data:image/jpeg;base64,FAKE2", caption: "Fundos", order: 2 },
  ],
  conclusion: "Nenhum risco identificado.",
  notes: "Medição feita com trena a laser.",
  status: "completed",
  createdAt: "2026-09-14T10:00:00.000Z",
  updatedAt: "2026-09-14T10:00:00.000Z",
};

describe("generateLaudoPdf", () => {
  it("assembles a multi-page PDF (cover + summary + every section, glossary alone spans several pages)", () => {
    const doc = generateLaudoPdf(sampleLaudo);
    expect(doc.getNumberOfPages()).toBeGreaterThan(10);
    expect(lastAddImageSpy).toHaveBeenCalled();
  });

  it("lists every fixed section in the summary, including Notas Técnicas when notes are present", () => {
    generateLaudoPdf(sampleLaudo);
    const textSpy = lastTextSpy;

    // x=15 is unique to drawSummarySection's title column (the per-section
    // header band draws its title at x=10), so this only matches the TOC line.
    [
      "Identificação do Solicitante",
      "Identificação do Imóvel",
      "Registro Fotográfico",
      "Notas Técnicas do Engenheiro",
      "Instrumentos Utilizados",
      "Glossário de Patologias",
      "Conclusão",
      "Referências",
      "Assinaturas",
    ].forEach((title) => {
      expect(textSpy).toHaveBeenCalledWith(title, 15, expect.any(Number));
    });
  });

  it("omits Notas Técnicas entirely (header band and summary) when notes are empty", () => {
    generateLaudoPdf({ ...sampleLaudo, notes: "" });

    const notesCalls = lastTextSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === "Notas Técnicas do Engenheiro",
    );
    expect(notesCalls).toHaveLength(0);
  });
});

describe("downloadLaudoPdf", () => {
  it("calls doc.save with a filesystem-safe filename derived from the property address", () => {
    downloadLaudoPdf(sampleLaudo);

    expect(lastSaveSpy).toHaveBeenCalledWith("laudo-Rua_B_2.pdf");
  });
});
