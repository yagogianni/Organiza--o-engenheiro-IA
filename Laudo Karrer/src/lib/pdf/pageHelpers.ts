import type { jsPDF } from "jspdf";
import { drawHeader } from "@/lib/pdf/sections/header";
import { drawFooter } from "@/lib/pdf/sections/footer";

export interface PageCursor {
  pageNumber: number;
}

export function newPage(doc: jsPDF, sectionTitle: string, cursor: PageCursor): void {
  doc.addPage();
  cursor.pageNumber += 1;
  drawHeader(doc, sectionTitle, cursor.pageNumber);
  drawFooter(doc);
}

export function drawFieldList(
  doc: jsPDF,
  fields: { label: string; value: string }[],
  startY: number,
): number {
  let y = startY;
  fields.forEach(({ label, value }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "—", 70, y);
    y += 8;
  });
  return y;
}
