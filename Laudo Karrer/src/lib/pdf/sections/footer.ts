import type { jsPDF } from "jspdf";
import { FOOTER_HEIGHT, KARRER_BLUE, LEFT_MARGIN, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/constants";

export function drawFooter(doc: jsPDF): void {
  doc.setFillColor(KARRER_BLUE);
  doc.rect(0, PAGE_HEIGHT - FOOTER_HEIGHT, PAGE_WIDTH, FOOTER_HEIGHT, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("KARRER SERVIÇOS DE ENGENHARIA LTDA", LEFT_MARGIN, PAGE_HEIGHT - 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Bernardo Sieverdt Karrer — CREA/SC: 199052-0 — eng.bernardokarrer@hotmail.com — (47) 99977-0433",
    LEFT_MARGIN,
    PAGE_HEIGHT - 6,
  );
}
