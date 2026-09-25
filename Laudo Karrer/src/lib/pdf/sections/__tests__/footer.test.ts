import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawFooter } from "@/lib/pdf/sections/footer";

describe("drawFooter", () => {
  it("draws a solid Karrer-blue band with the company name and contact details", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const rectSpy = vi.spyOn(doc, "rect");

    expect(() => drawFooter(doc)).not.toThrow();

    // filled rectangle, not a thin line — this is the "faixa azul lá embaixo"
    // the client asked to keep, confirmed against the real reference PDF.
    expect(rectSpy).toHaveBeenCalledWith(0, expect.any(Number), expect.any(Number), 20, "F");
    expect(textSpy).toHaveBeenCalledWith(
      "KARRER SERVIÇOS DE ENGENHARIA LTDA",
      15,
      expect.any(Number),
    );
    expect(textSpy).toHaveBeenCalledWith(
      "Bernardo Sieverdt Karrer — CREA/SC: 199052-0 — eng.bernardokarrer@hotmail.com — (47) 99977-0433",
      15,
      expect.any(Number),
    );
  });
});
