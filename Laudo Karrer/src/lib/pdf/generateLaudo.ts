import { jsPDF } from "jspdf";
import type { PhotoReport } from "@/types/laudo";
import { drawChrome, drawPageNumbers, type PageCursor } from "@/lib/pdf/pageHelpers";
import { drawPhotosSection } from "@/lib/pdf/sections/photos";
import { PDF_LAYOUT, resolvePdfOptions, type CaptionPosition } from "@/lib/pdf/constants";

export function generateLaudoPdf(report: PhotoReport, captionPosition?: CaptionPosition): jsPDF {
  // Points, so every measure in PDF_LAYOUT maps 1:1 to the A4 page (595.28 x 841.89).
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const cursor: PageCursor = { pageNumber: 1 };
  const options = resolvePdfOptions(report.pdfOptions);

  drawChrome(doc, options);

  if (options.includeTitle) {
    const { title, marginX } = PDF_LAYOUT;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(title.fontSize);
    doc.setTextColor("#334155");
    doc.text(title.text, marginX, title.baselineY);
  }

  drawPhotosSection(doc, report.photos, cursor, options, captionPosition);

  if (options.numberPages) drawPageNumbers(doc, options);

  return doc;
}

export function downloadLaudoPdf(report: PhotoReport): void {
  const doc = generateLaudoPdf(report);
  // Strip diacritics (NFD normalize + drop combining marks) before the
  // safe-character replace, so e.g. "Libéria" becomes "Liberia" instead of
  // "Lib_ria".
  const baseName = (report.label?.trim() || report.id).normalize("NFD").replace(/[̀-ͯ]/g, "");
  const safeName = `registro-fotografico-${baseName}.pdf`.replace(/[^\w.-]+/g, "_");
  doc.save(safeName);
}
