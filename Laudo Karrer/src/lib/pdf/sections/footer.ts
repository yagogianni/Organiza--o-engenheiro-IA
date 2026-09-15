import type { jsPDF } from "jspdf";
import { KARRER_BLUE, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/constants";

export function drawFooter(doc: jsPDF): void {
  doc.setDrawColor(KARRER_BLUE);
  doc.setLineWidth(0.5);
  doc.line(10, PAGE_HEIGHT - 15, PAGE_WIDTH - 10, PAGE_HEIGHT - 15);

  doc.setTextColor("#64748B");
  doc.setFontSize(8);
  doc.text(
    "Bernardo Sieverdt Karrer — CREA/SC: 199052-0 — eng.bernardokarrer@hotmail.com",
    10,
    PAGE_HEIGHT - 10,
  );
}
