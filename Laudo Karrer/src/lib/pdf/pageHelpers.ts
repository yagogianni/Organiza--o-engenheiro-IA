import type { jsPDF } from "jspdf";
import { drawHeader } from "@/lib/pdf/sections/header";
import { drawFooter } from "@/lib/pdf/sections/footer";

export interface PageCursor {
  pageNumber: number;
}

export function newPage(doc: jsPDF, sectionTitle: string, cursor: PageCursor): void {
  doc.addPage();
  cursor.pageNumber += 1;
  drawHeader(doc, sectionTitle, cursor.pageNumber);
  drawFooter(doc);
}
