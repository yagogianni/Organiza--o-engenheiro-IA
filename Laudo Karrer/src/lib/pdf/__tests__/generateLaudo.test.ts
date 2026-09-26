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

  it("strips accents from the label instead of mangling them into underscores", () => {
    downloadLaudoPdf({ ...sampleReport, label: "Rua Libéria" });
    expect(lastSaveSpy).toHaveBeenCalledWith("registro-fotografico-Rua_Liberia.pdf");
  });

  it("falls back to the report id when the label is only whitespace", () => {
    downloadLaudoPdf({ ...sampleReport, label: "   " });
    expect(lastSaveSpy).toHaveBeenCalledWith("registro-fotografico-1.pdf");
  });
});
