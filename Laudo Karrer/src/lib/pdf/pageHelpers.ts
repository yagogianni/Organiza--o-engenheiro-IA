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

export function drawBulletList(
  doc: jsPDF,
  cursor: PageCursor,
  sectionTitle: string,
  items: string[],
): void {
  newPage(doc, sectionTitle, cursor);
  let y = 30;
  doc.setFontSize(10);
  doc.setTextColor("#334155");
  items.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, 180);
    if (y + lines.length * 6 > 275) {
      newPage(doc, sectionTitle, cursor);
      y = 30;
    }
    doc.text(lines, 15, y);
    y += lines.length * 6 + 2;
  });
}

export function drawTermList(
  doc: jsPDF,
  cursor: PageCursor,
  sectionTitle: string,
  terms: { term: string; definition: string }[],
): void {
  newPage(doc, sectionTitle, cursor);
  let y = 30;
  terms.forEach(({ term, definition }) => {
    const defLines = doc.splitTextToSize(definition, 180);
    const blockHeight = 6 + defLines.length * 5 + 4;
    if (y + blockHeight > 275) {
      newPage(doc, sectionTitle, cursor);
      y = 30;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(term, 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(defLines, 15, y);
    y += defLines.length * 5 + 4;
  });
}
