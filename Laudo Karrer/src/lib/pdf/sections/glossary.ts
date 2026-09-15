import type { jsPDF } from "jspdf";
import { drawTermList, type PageCursor } from "@/lib/pdf/pageHelpers";
import { GLOSSARY } from "@/lib/pdf/content/glossary";

export function drawGlossarySection(doc: jsPDF, cursor: PageCursor): void {
  drawTermList(doc, cursor, "Glossário de Patologias", GLOSSARY);
}
