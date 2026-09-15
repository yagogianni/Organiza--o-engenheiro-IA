import { jsPDF } from "jspdf";
import type { LaudoData } from "@/types/laudo";
import type { PageCursor } from "@/lib/pdf/pageHelpers";
import { drawCover } from "@/lib/pdf/sections/cover";
import { drawClientSection } from "@/lib/pdf/sections/client";
import { drawPropertySection } from "@/lib/pdf/sections/property";
import { drawPhotosSection } from "@/lib/pdf/sections/photos";
import { drawNotesSection } from "@/lib/pdf/sections/notes";
import { drawInstrumentsSection } from "@/lib/pdf/sections/instruments";
import { drawGlossarySection } from "@/lib/pdf/sections/glossary";
import { drawConclusionSection } from "@/lib/pdf/sections/conclusion";
import { drawReferencesSection } from "@/lib/pdf/sections/references";
import { drawSignaturesSection } from "@/lib/pdf/sections/signatures";
import { drawSummarySection, type SummaryEntry } from "@/lib/pdf/sections/summary";

export function generateLaudoPdf(laudo: LaudoData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cursor: PageCursor = { pageNumber: 1 };

  drawCover(doc, laudo);

  doc.addPage(); // page 2, reserved blank for the summary
  cursor.pageNumber = 2;

  const entries: SummaryEntry[] = [];
  const track = (title: string, draw: () => void) => {
    const startPage = cursor.pageNumber + 1; // the section's own newPage() bumps first
    draw();
    entries.push({ title, page: startPage });
  };

  track("Identificação do Solicitante", () => drawClientSection(doc, laudo.client, cursor));
  track("Identificação do Imóvel", () => drawPropertySection(doc, laudo.property, cursor));
  track("Registro Fotográfico", () => drawPhotosSection(doc, laudo.photos, cursor));

  if (laudo.notes && laudo.notes.trim().length > 0) {
    track("Notas Técnicas do Engenheiro", () => drawNotesSection(doc, laudo.notes, cursor));
  }

  track("Instrumentos Utilizados", () => drawInstrumentsSection(doc, cursor));
  track("Glossário de Patologias", () => drawGlossarySection(doc, cursor));
  track("Conclusão", () => drawConclusionSection(doc, laudo.conclusion, cursor));
  track("Referências", () => drawReferencesSection(doc, cursor));
  track("Assinaturas", () => drawSignaturesSection(doc, laudo, cursor));

  doc.setPage(2);
  drawSummarySection(doc, entries, 2);
  doc.setPage(doc.getNumberOfPages());

  return doc;
}

export function downloadLaudoPdf(laudo: LaudoData): void {
  const doc = generateLaudoPdf(laudo);
  const safeName = `laudo-${laudo.property.address || laudo.id}.pdf`.replace(/[^\w.-]+/g, "_");
  doc.save(safeName);
}
