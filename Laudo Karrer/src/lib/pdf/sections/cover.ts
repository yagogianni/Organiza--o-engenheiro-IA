import type { jsPDF } from "jspdf";
import type { LaudoData } from "@/types/laudo";
import { LAUDO_TYPE_LABELS } from "@/types/laudo";
import { KARRER_BLUE, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/constants";

const SIDEBAR_WIDTH = 55;

export function drawCover(doc: jsPDF, laudo: LaudoData): void {
  doc.setFillColor(KARRER_BLUE);
  doc.rect(0, 0, SIDEBAR_WIDTH, PAGE_HEIGHT, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFontSize(16);
  doc.text("KARRER SERVIÇOS DE ENGENHARIA", SIDEBAR_WIDTH / 2, PAGE_HEIGHT / 2, {
    angle: 90,
    align: "center",
  });

  doc.setTextColor(KARRER_BLUE);
  doc.setFontSize(20);
  doc.text(LAUDO_TYPE_LABELS[laudo.type], SIDEBAR_WIDTH + 15, 40);

  doc.setFontSize(11);
  doc.setTextColor("#334155");
  let y = 60;
  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, SIDEBAR_WIDTH + 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, SIDEBAR_WIDTH + 15, y + 6);
    y += 16;
  };
  line("Cliente", laudo.client.name);
  line("Imóvel", laudo.property.address);
  line("ART", laudo.property.artNumber);
  line("Data da vistoria", laudo.property.inspectionDate);

  doc.setFillColor(KARRER_BLUE);
  doc.rect(SIDEBAR_WIDTH, PAGE_HEIGHT - 20, PAGE_WIDTH - SIDEBAR_WIDTH, 20, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(9);
  doc.text(
    "Karrer Serviços de Engenharia Ltda — CREA/SC: 199052-0",
    SIDEBAR_WIDTH + 10,
    PAGE_HEIGHT - 10,
  );
}
