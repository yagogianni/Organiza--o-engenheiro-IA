import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawFooter, FOOTER_COMPANY_LINE, FOOTER_CONTACT_LINE } from "@/lib/pdf/sections/footer";
import { PDF_LAYOUT } from "@/lib/pdf/constants";

describe("drawFooter", () => {
  it("draws a solid Karrer-blue band with the company name and contact details", () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const rectSpy = vi.spyOn(doc, "rect");

    expect(() => drawFooter(doc)).not.toThrow();

    // filled rectangle, not a thin line — this is the "faixa azul lá embaixo"
    // the client asked to keep, confirmed against the real reference PDF.
    expect(rectSpy).toHaveBeenCalledWith(
      0,
      PDF_LAYOUT.footer.top,
      PDF_LAYOUT.page.width,
      PDF_LAYOUT.footer.height,
      "F",
    );
    expect(textSpy).toHaveBeenCalledWith("KARRER SERVIÇOS DE ENGENHARIA LTDA", PDF_LAYOUT.marginX, expect.any(Number));
    expect(FOOTER_COMPANY_LINE).toBe("KARRER SERVIÇOS DE ENGENHARIA LTDA");
    expect(textSpy).toHaveBeenCalledWith(FOOTER_CONTACT_LINE, PDF_LAYOUT.marginX, expect.any(Number));
  });

  it("ends exactly at the bottom of the A4 page", () => {
    expect(PDF_LAYOUT.footer.top + PDF_LAYOUT.footer.height).toBeCloseTo(PDF_LAYOUT.page.height, 2);
  });
});
