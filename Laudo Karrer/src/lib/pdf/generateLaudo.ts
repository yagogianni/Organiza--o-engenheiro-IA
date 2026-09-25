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
  const safeName = `registro-fotografico-${report.label || report.id}.pdf`.replace(/[^\w.-]+/g, "_");
  doc.save(safeName);
}
