import type { jsPDF } from "jspdf";
import { drawFooter } from "@/lib/pdf/sections/footer";

export interface PageCursor {
  pageNumber: number;
}

const DEFAULT_TEXT_COLOR = "#334155";

export function drawChrome(doc: jsPDF): void {
  drawFooter(doc);
  doc.setTextColor(DEFAULT_TEXT_COLOR);
}

export function newPage(doc: jsPDF, cursor: PageCursor): void {
  doc.addPage();
  cursor.pageNumber += 1;
  drawChrome(doc);
}
