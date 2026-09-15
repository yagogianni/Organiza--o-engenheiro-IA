import type { jsPDF } from "jspdf";
import type { PhotoItem } from "@/types/laudo";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

const CONTENT_TOP = 30;
const CONTENT_BOTTOM = 275;
const COL_WIDTH = 90;
const ROW_HEIGHT = 90;
const IMAGE_SIZE = 80;
const LEFT_MARGIN = 15;
const SECTION_NUMBER = 4;

export function drawPhotosSection(doc: jsPDF, photos: PhotoItem[], cursor: PageCursor): void {
  newPage(doc, "Registro Fotográfico", cursor);

  let y = CONTENT_TOP;
  photos.forEach((photo, index) => {
    const col = index % 2;
    const x = LEFT_MARGIN + col * COL_WIDTH;

    if (col === 0 && index > 0 && y + ROW_HEIGHT > CONTENT_BOTTOM) {
      newPage(doc, "Registro Fotográfico", cursor);
      y = CONTENT_TOP;
    }

    doc.addImage(photo.dataUrl, "JPEG", x, y, IMAGE_SIZE, IMAGE_SIZE * 0.75);
    doc.setFontSize(9);
    doc.setTextColor("#334155");
    doc.text(
      `${SECTION_NUMBER}.${photo.order} — ${photo.caption || "Sem legenda"}`,
      x,
      y + IMAGE_SIZE * 0.75 + 5,
    );

    if (col === 1) y += ROW_HEIGHT;
  });
}
