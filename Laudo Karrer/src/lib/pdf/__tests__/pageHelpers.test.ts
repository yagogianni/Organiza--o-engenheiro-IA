import { jsPDF } from "jspdf";
import { drawChrome, newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

function colorAfterSetting(hex: string): string {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setTextColor(hex);
  return doc.getTextColor();
}

const DEFAULT_BODY_COLOR = colorAfterSetting("#334155");
const FOOTER_WHITE = colorAfterSetting("#FFFFFF");

describe("drawChrome", () => {
  it("draws the footer and resets the text color to the default body color afterward", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    drawChrome(doc);

    expect(doc.getTextColor()).toBe(DEFAULT_BODY_COLOR);
    expect(doc.getTextColor()).not.toBe(FOOTER_WHITE);
  });
});

describe("newPage", () => {
  it("adds a page, increments the cursor, and draws chrome without throwing", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor: PageCursor = { pageNumber: 1 };

    expect(() => newPage(doc, cursor)).not.toThrow();
    expect(cursor.pageNumber).toBe(2);
    expect(doc.getNumberOfPages()).toBe(2);
    expect(doc.getTextColor()).toBe(DEFAULT_BODY_COLOR);
  });
});
