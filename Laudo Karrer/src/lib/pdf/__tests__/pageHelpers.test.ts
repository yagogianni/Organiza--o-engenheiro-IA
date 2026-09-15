import { jsPDF } from "jspdf";
import { drawChrome, newPage, type PageCursor } from "@/lib/pdf/pageHelpers";
import { drawFooter } from "@/lib/pdf/sections/footer";

// jsPDF's getTextColor() round-trips hex through an internal RGB
// representation, so it doesn't necessarily echo back the exact string that
// was passed to setTextColor (e.g. "#1E293B" comes back slightly different
// in case/rounding). Compute the expected value the same way instead of
// hardcoding a literal, so the assertion is robust to that quirk.
function colorAfterSetting(hex: string): string {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setTextColor(hex);
  return doc.getTextColor();
}

const DEFAULT_BODY_COLOR = colorAfterSetting("#1E293B");
const FOOTER_GRAY = colorAfterSetting("#64748B");

describe("drawChrome", () => {
  it("resets the text color to the default body color after drawing header/footer", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    // Simulate a previous page's footer leaving its gray text color set.
    drawFooter(doc);
    expect(doc.getTextColor()).toBe(FOOTER_GRAY);

    drawChrome(doc, "Identificação do Solicitante", 3);

    expect(doc.getTextColor()).toBe(DEFAULT_BODY_COLOR);
    expect(doc.getTextColor()).not.toBe(FOOTER_GRAY);
  });
});

describe("newPage", () => {
  it("leaves the text color reset so sections that don't set their own color (drawFieldList, drawSignaturesSection) draw correctly", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor: PageCursor = { pageNumber: 1 };
    drawFooter(doc); // stale gray from a prior page's footer

    newPage(doc, "Identificação do Imóvel", cursor);

    expect(doc.getTextColor()).toBe(DEFAULT_BODY_COLOR);
  });
});
