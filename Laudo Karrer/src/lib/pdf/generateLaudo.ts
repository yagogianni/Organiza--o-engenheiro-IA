import { jsPDF } from "jspdf";
import type { PhotoReport } from "@/types/laudo";
import { drawChrome, type PageCursor } from "@/lib/pdf/pageHelpers";
import { drawPhotosSection } from "@/lib/pdf/sections/photos";
import { LEFT_MARGIN } from "@/lib/pdf/constants";

export function generateLaudoPdf(report: PhotoReport): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cursor: PageCursor = { pageNumber: 1 };

  drawChrome(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#334155");
  doc.text("Registro Fotográfico", LEFT_MARGIN, 18);

  drawPhotosSection(doc, report.photos, cursor);

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
