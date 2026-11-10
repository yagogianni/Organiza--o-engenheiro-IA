import type { jsPDF } from "jspdf";
import { KARRER_BLUE, PDF_LAYOUT } from "@/lib/pdf/constants";

const { page, marginX, footer } = PDF_LAYOUT;

export const FOOTER_COMPANY_LINE = "KARRER SERVIÇOS DE ENGENHARIA LTDA";
export const FOOTER_CONTACT_LINE =
  "Bernardo Sieverdt Karrer — CREA/SC: 199052-0 — eng.bernardokarrer@hotmail.com — (47) 99977-0433";

export function drawFooter(doc: jsPDF): void {
  doc.setFillColor(KARRER_BLUE);
  doc.rect(0, footer.top, page.width, footer.height, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(footer.companyFontSize);
  doc.text(FOOTER_COMPANY_LINE, marginX, footer.top + footer.companyLineOffsetY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(footer.contactFontSize);
  doc.text(FOOTER_CONTACT_LINE, marginX, footer.top + footer.contactLineOffsetY);
}
