import type { jsPDF } from "jspdf";
import type { PropertyData } from "@/types/laudo";
import { newPage, drawFieldList, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawPropertySection(doc: jsPDF, property: PropertyData, cursor: PageCursor): void {
  newPage(doc, "Identificação do Imóvel", cursor);
  const y = drawFieldList(
    doc,
    [
      { label: "Endereço", value: property.address },
      { label: "Bairro", value: property.neighborhood },
      { label: "Cidade/UF", value: `${property.city}/${property.state}` },
      { label: "Data da vistoria", value: property.inspectionDate },
      { label: "Número ART", value: property.artNumber },
    ],
    35,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Descrição do imóvel", 15, y + 4);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(property.description || "—", 180);
  doc.text(lines, 15, y + 12);
}
