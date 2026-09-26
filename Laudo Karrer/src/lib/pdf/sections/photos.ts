import type { jsPDF } from "jspdf";
import type { PhotoItem } from "@/types/laudo";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";
import { FOOTER_HEIGHT, LEFT_MARGIN, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/constants";

const COLUMN_GAP = 4;
const ROW_GAP = 6;
const CAPTION_HEIGHT = 16;
// 3 lines of 9pt text comfortably fits inside the 16mm CAPTION_HEIGHT box with margin.
const MAX_CAPTION_LINES = 3;
const CONTENT_TOP = 25;
const CONTENT_BOTTOM = PAGE_HEIGHT - FOOTER_HEIGHT - 5;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN * 2;
const COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2;
const CONTENT_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP;
const QUARTER_CELL_HEIGHT = (CONTENT_HEIGHT - ROW_GAP) / 2;
const BORDER_COLOR = "#334155";

interface Cell {
  x: number;
  y: number;
  width: number;
  height: number;
}

function columnX(col: number): number {
  return col === 0 ? LEFT_MARGIN : LEFT_MARGIN + COLUMN_WIDTH + COLUMN_GAP;
}

function fitImage(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
): void {
  const { width: pxWidth, height: pxHeight } = doc.getImageProperties(dataUrl);
  const aspect = pxWidth / pxHeight;
  const boxAspect = boxWidth / boxHeight;

  const drawWidth = aspect > boxAspect ? boxWidth : boxHeight * aspect;
  const drawHeight = aspect > boxAspect ? boxWidth / aspect : boxHeight;

  doc.addImage(
    dataUrl,
    "JPEG",
    x + (boxWidth - drawWidth) / 2,
    y + (boxHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawCell(doc: jsPDF, cell: Cell, dataUrl: string, captionText: string): void {
  const imageHeight = cell.height - CAPTION_HEIGHT;

  doc.setDrawColor(BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.rect(cell.x, cell.y, cell.width, imageHeight);
  doc.rect(cell.x, cell.y + imageHeight, cell.width, CAPTION_HEIGHT);

  fitImage(doc, dataUrl, cell.x, cell.y, cell.width, imageHeight);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(BORDER_COLOR);

  const maxTextWidth = cell.width - 4;
  let lines: string[] = doc.splitTextToSize(captionText, maxTextWidth);
  if (lines.length > MAX_CAPTION_LINES) {
    const truncated = lines.slice(0, MAX_CAPTION_LINES);
    const lastLine = truncated[MAX_CAPTION_LINES - 1];
    const shortened = lastLine.length > 4 ? lastLine.slice(0, -4) : lastLine;
    truncated[MAX_CAPTION_LINES - 1] = doc.splitTextToSize(`${shortened}…`, maxTextWidth)[0];
    lines = truncated;
  }

  // jsPDF's `baseline: "middle"` only centers the Y passed into a single
  // text() call — with an array of lines it centers the first line and then
  // advances each subsequent line downward, so a multi-line caption drifts
  // below the caption box instead of being centered as a block. Calling
  // text() once per line, each with baseline "middle" at that line's own
  // vertical center, keeps each line correctly centered (verified against
  // jsPDF v4.2.1's source: the baseline offset is computed fresh, per call,
  // from the y passed in — see node_modules/jspdf/dist/jspdf.node.js ~L4492).
  const lineHeight = (doc.getFontSize() / doc.internal.scaleFactor) * 1.15;
  const blockCenterY = cell.y + imageHeight + CAPTION_HEIGHT / 2;
  const startY = blockCenterY - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, i) => {
    doc.text(line, cell.x + cell.width / 2, startY + i * lineHeight, {
      align: "center",
      baseline: "middle",
    });
  });
}

export function drawPhotosSection(doc: jsPDF, photos: PhotoItem[], cursor: PageCursor): void {
  let columns = [0, 0];

  function goToFreshPage(): void {
    newPage(doc, cursor);
    columns = [0, 0];
  }

  photos.forEach((photo) => {
    const caption = `${photo.order} - ${photo.caption || "Sem legenda"}`;

    if (photo.size === "full") {
      if (columns.some((used) => used > 0)) goToFreshPage();
      drawCell(
        doc,
        { x: LEFT_MARGIN, y: CONTENT_TOP, width: CONTENT_WIDTH, height: CONTENT_HEIGHT },
        photo.dataUrl,
        caption,
      );
      columns = [2, 2];
      return;
    }

    if (photo.size === "half") {
      let col = columns.findIndex((used) => used === 0);
      if (col === -1) {
        goToFreshPage();
        col = 0;
      }
      drawCell(
        doc,
        { x: columnX(col), y: CONTENT_TOP, width: COLUMN_WIDTH, height: CONTENT_HEIGHT },
        photo.dataUrl,
        caption,
      );
      columns[col] = 2;
      return;
    }

    // "quarter", and the fallback for legacy data with no/invalid size
    let col = columns.findIndex((used) => used < 2);
    if (col === -1) {
      goToFreshPage();
      col = 0;
    }
    const topHalf = columns[col] === 0;
    const y = topHalf ? CONTENT_TOP : CONTENT_TOP + QUARTER_CELL_HEIGHT + ROW_GAP;
    drawCell(doc, { x: columnX(col), y, width: COLUMN_WIDTH, height: QUARTER_CELL_HEIGHT }, photo.dataUrl, caption);
    columns[col] += 1;
  });
}
