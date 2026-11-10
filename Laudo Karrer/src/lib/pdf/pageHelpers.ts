import type { jsPDF } from "jspdf";
import type { PdfOptions } from "@/types/laudo";
import { drawFooter } from "@/lib/pdf/sections/footer";
import { DEFAULT_PDF_OPTIONS, PDF_LAYOUT } from "@/lib/pdf/constants";

export interface PageCursor {
  pageNumber: number;
}

const DEFAULT_TEXT_COLOR = "#334155";

export function drawChrome(doc: jsPDF, options: PdfOptions = DEFAULT_PDF_OPTIONS): void {
  if (options.includeFooter) drawFooter(doc);
  doc.setTextColor(DEFAULT_TEXT_COLOR);
}

export function newPage(doc: jsPDF, cursor: PageCursor, options: PdfOptions = DEFAULT_PDF_OPTIONS): void {
  doc.addPage();
  cursor.pageNumber += 1;
  drawChrome(doc, options);
}

/** "Página X de Y" em todas as páginas; chamar depois que o documento estiver completo. */
export function drawPageNumbers(doc: jsPDF, options: PdfOptions): void {
  const { page, marginX, footer, pageNumber } = PDF_LAYOUT;
  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(pageNumber.fontSize);
    const label = `Página ${i} de ${total}`;

    if (options.includeFooter) {
      // Canto direito da faixa azul, alinhado com a linha do nome da empresa.
      doc.setTextColor("#FFFFFF");
      doc.text(label, page.width - marginX, footer.top + footer.companyLineOffsetY, { align: "right" });
    } else {
      doc.setTextColor(DEFAULT_TEXT_COLOR);
      doc.text(label, page.width / 2, page.height - pageNumber.offsetFromBottomWithoutFooter, {
        align: "center",
      });
    }
  }
  doc.setTextColor(DEFAULT_TEXT_COLOR);
}
