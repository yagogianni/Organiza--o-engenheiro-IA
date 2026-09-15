import type { jsPDF } from "jspdf";
import { drawChrome } from "@/lib/pdf/pageHelpers";

export interface SummaryEntry {
  title: string;
  page: number;
}

export function drawSummarySection(doc: jsPDF, entries: SummaryEntry[], pageNumber: number): void {
  drawChrome(doc, "Sumário", pageNumber);
  let y = 30;
  doc.setFontSize(11);
  doc.setTextColor("#1E293B");
  entries.forEach(({ title, page }) => {
    doc.text(title, 15, y);
    doc.text(String(page), 195, y, { align: "right" });
    y += 8;
  });
}
