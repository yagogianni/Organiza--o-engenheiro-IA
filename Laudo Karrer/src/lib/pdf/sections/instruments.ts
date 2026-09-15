import type { jsPDF } from "jspdf";
import { drawBulletList, type PageCursor } from "@/lib/pdf/pageHelpers";
import { INSTRUMENTS } from "@/lib/pdf/content/instruments";

export function drawInstrumentsSection(doc: jsPDF, cursor: PageCursor): void {
  drawBulletList(doc, cursor, "Instrumentos Utilizados", INSTRUMENTS);
}
