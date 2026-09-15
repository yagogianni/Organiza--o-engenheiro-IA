import type { jsPDF } from "jspdf";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawNotesSection(doc: jsPDF, notes: string | undefined, cursor: PageCursor): void {
  if (!notes || notes.trim().length === 0) return;

  newPage(doc, "Notas Técnicas do Engenheiro", cursor);

  const marginX = 15;
  const boxY = 30;
  const boxWidth = 180;
  const lines = doc.splitTextToSize(notes, boxWidth - 12);
  const boxHeight = Math.max(30, lines.length * 6 + 12);

  doc.setFillColor("#F8FAFC");
  doc.rect(marginX, boxY, boxWidth, boxHeight, "F");
  doc.setDrawColor("#1B3A6B");
  doc.setLineWidth(1.2); // ~4px border-left, converted to mm at 96dpi
  doc.line(marginX, boxY, marginX, boxY + boxHeight);

  doc.setTextColor("#334155");
  doc.setFontSize(10);
  doc.text(lines, marginX + 8, boxY + 10);
}
