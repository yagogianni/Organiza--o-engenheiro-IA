import type { jsPDF } from "jspdf";
import { KARRER_BLUE, KARRER_LIGHTBLUE, PAGE_WIDTH } from "@/lib/pdf/constants";

export function drawHeader(doc: jsPDF, sectionTitle: string, pageNumber: number): void {
  doc.setFillColor(KARRER_BLUE);
  doc.rect(0, 0, PAGE_WIDTH, 14, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(10);
  doc.text("Karrer Serviços de Engenharia", 10, 9);
  doc.text(`Página ${pageNumber}`, PAGE_WIDTH - 10, 9, { align: "right" });

  doc.setFillColor(KARRER_LIGHTBLUE);
  doc.rect(0, 14, PAGE_WIDTH, 10, "F");
  doc.setFontSize(11);
  doc.text(sectionTitle, 10, 21);
}
