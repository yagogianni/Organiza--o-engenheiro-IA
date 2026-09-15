import type { jsPDF } from "jspdf";
import { drawBulletList, type PageCursor } from "@/lib/pdf/pageHelpers";
import { REFERENCES } from "@/lib/pdf/content/references";

export function drawReferencesSection(doc: jsPDF, cursor: PageCursor): void {
  drawBulletList(doc, cursor, "Referências", REFERENCES);
}
