import type { jsPDF } from "jspdf";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawConclusionSection(doc: jsPDF, conclusion: string, cursor: PageCursor): void {
  newPage(doc, "Conclusão", cursor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#1E293B");
  const lines = doc.splitTextToSize(conclusion, 180);
  doc.text(lines, 15, 35);
}
