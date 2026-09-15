import type { jsPDF } from "jspdf";
import type { LaudoData } from "@/types/laudo";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawSignaturesSection(doc: jsPDF, laudo: LaudoData, cursor: PageCursor): void {
  newPage(doc, "Assinaturas", cursor);

  const lineY = 120;
  doc.setDrawColor("#334155");
  doc.setLineWidth(0.3);

  doc.line(20, lineY, 90, lineY);
  doc.setFontSize(10);
  doc.text(laudo.client.name || "Contratante", 20, lineY + 6);
  doc.text("Contratante", 20, lineY + 11);

  doc.line(110, lineY, 180, lineY);
  doc.text("Bernardo Sieverdt Karrer", 110, lineY + 6);
  doc.text("CREA/SC: 199052-0", 110, lineY + 11);
}
