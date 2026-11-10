import type { jsPDF } from "jspdf";
import type { PdfOptions, PhotoItem } from "@/types/laudo";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";
import {
  CAPTION_POSITION,
  DEFAULT_PDF_OPTIONS,
  PDF_LAYOUT,
  type CaptionPosition,
} from "@/lib/pdf/constants";

const { page, contentTop, bottomMarginWithoutFooter, footer, grid, caption, side, border } = PDF_LAYOUT;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The 2x2 grid's position and cell size on a page, given the PDF options. */
interface GridFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
}

export function computeGridFrame(options: PdfOptions): GridFrame {
  const width = grid.cellWidth * 2 + grid.columnGap;
  const areaBottom = options.includeFooter
    ? footer.top - footer.gapAbove
    : page.height - bottomMarginWithoutFooter;
  const available = areaBottom - contentTop;
  const fillHeight = (available - grid.rowGap) / 2;

  // With the footer, cells keep the configured height (shrinking only if the
  // configured measures don't fit). Without it, cells grow into the freed
  // space — the extra height goes to the photo, the caption box keeps its size.
  const cellHeight = options.includeFooter ? Math.min(grid.cellHeight, fillHeight) : fillHeight;
  const height = cellHeight * 2 + grid.rowGap;

  return {
    x: (page.width - width) / 2,
    y: contentTop + (available - height) / 2,
    width,
    height,
    cellWidth: grid.cellWidth,
    cellHeight,
  };
}

/**
 * Slot 0..3 of the 2x2 grid, filled row by row:
 *   0 1
 *   2 3
 */
export function quarterSlotRect(frame: GridFrame, slot: number): Rect {
  const col = slot % 2;
  const row = Math.floor(slot / 2) % 2;
  return {
    x: frame.x + col * (frame.cellWidth + grid.columnGap),
    y: frame.y + row * (frame.cellHeight + grid.rowGap),
    width: frame.cellWidth,
    height: frame.cellHeight,
  };
}

function halfColumnRect(frame: GridFrame, col: number): Rect {
  return {
    x: frame.x + col * (frame.cellWidth + grid.columnGap),
    y: frame.y,
    width: frame.cellWidth,
    height: frame.height,
  };
}

function fitImage(doc: jsPDF, dataUrl: string, box: Rect): void {
  const { width: pxWidth, height: pxHeight } = doc.getImageProperties(dataUrl);
  const aspect = pxWidth / pxHeight;
  const boxAspect = box.width / box.height;

  // "contain": keep the photo's proportions, centered inside the box.
  const drawWidth = aspect > boxAspect ? box.width : box.height * aspect;
  const drawHeight = aspect > boxAspect ? box.width / aspect : box.height;

  doc.addImage(
    dataUrl,
    "JPEG",
    box.x + (box.width - drawWidth) / 2,
    box.y + (box.height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

interface FittedCaption {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  /** Height the caption box must have to hold `lines`. */
  boxHeight: number;
}

function truncateWithEllipsis(doc: jsPDF, lines: string[], maxLines: number, textWidth: number): string[] {
  const kept = lines.slice(0, maxLines);
  let last = kept[kept.length - 1].trimEnd();
  while (last.length > 0 && doc.getTextWidth(`${last}…`) > textWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  kept[kept.length - 1] = `${last}…`;
  return kept;
}

/**
 * Fits caption text into a box of the given width:
 * 1. wrap lines (splitTextToSize) at the default font size;
 * 2. if it doesn't fit `baseHeight`, step the font down to the minimum legible size;
 * 3. if it still doesn't fit, grow the box up to `maxHeight` (the caller
 *    takes that height away from the photo);
 * 4. only past `maxHeight` is the text cut, ending in "…".
 * Leaves the doc's font size set to the returned `fontSize`.
 */
export function fitCaption(
  doc: jsPDF,
  text: string,
  boxWidth: number,
  baseHeight: number,
  maxHeight: number,
): FittedCaption {
  const textWidth = boxWidth - caption.paddingX * 2;
  const steps = Math.round((caption.fontSize - caption.minFontSize) / caption.fontSizeStep);

  let lines: string[] = [];
  let fontSize: number = caption.fontSize;
  let lineHeight = 0;
  let needed = 0;

  for (let i = 0; i <= steps; i += 1) {
    fontSize = caption.fontSize - i * caption.fontSizeStep;
    doc.setFontSize(fontSize);
    lines = doc.splitTextToSize(text, textWidth);
    lineHeight = (fontSize / doc.internal.scaleFactor) * caption.lineHeightFactor;
    needed = lines.length * lineHeight + caption.paddingY * 2;
    if (needed <= baseHeight) return { lines, fontSize, lineHeight, boxHeight: baseHeight };
  }

  // At the minimum font size and still too tall for the default box.
  if (needed <= maxHeight) return { lines, fontSize, lineHeight, boxHeight: needed };

  const maxLines = Math.max(1, Math.floor((maxHeight - caption.paddingY * 2) / lineHeight));
  return {
    lines: truncateWithEllipsis(doc, lines, maxLines, textWidth),
    fontSize,
    lineHeight,
    boxHeight: maxHeight,
  };
}

function drawCaptionLines(doc: jsPDF, fitted: FittedCaption, box: Rect, align: "center" | "left"): void {
  // jsPDF's `baseline: "middle"` only centers the y passed to a single text()
  // call — with an array of lines it centers the first line and pushes the
  // rest downward. One text() call per line, each at its own vertical center,
  // keeps the block centered in the box.
  const blockCenterY = box.y + box.height / 2;
  const startY = blockCenterY - ((fitted.lines.length - 1) * fitted.lineHeight) / 2;
  const x = align === "center" ? box.x + box.width / 2 : box.x + caption.paddingX;

  fitted.lines.forEach((line, i) => {
    doc.text(line, x, startY + i * fitted.lineHeight, { align, baseline: "middle" });
  });
}

function drawCell(
  doc: jsPDF,
  cell: Rect,
  dataUrl: string,
  captionText: string,
  position: CaptionPosition,
): void {
  doc.setDrawColor(border.color);
  doc.setLineWidth(border.width);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(border.color);

  if (position === "side") {
    const photoWidth = cell.width * side.photoWidthRatio;
    const photoBox = { x: cell.x, y: cell.y, width: photoWidth, height: cell.height };
    const captionBox = { x: cell.x + photoWidth, y: cell.y, width: cell.width - photoWidth, height: cell.height };
    const fitted = fitCaption(doc, captionText, captionBox.width, captionBox.height, captionBox.height);

    doc.rect(photoBox.x, photoBox.y, photoBox.width, photoBox.height);
    doc.rect(captionBox.x, captionBox.y, captionBox.width, captionBox.height);
    fitImage(doc, dataUrl, photoBox);
    drawCaptionLines(doc, fitted, captionBox, "left");
    return;
  }

  const maxCaptionHeight = Math.max(grid.captionHeight, cell.height * caption.maxHeightRatio);
  const fitted = fitCaption(doc, captionText, cell.width, grid.captionHeight, maxCaptionHeight);
  const photoBox = { x: cell.x, y: cell.y, width: cell.width, height: cell.height - fitted.boxHeight };
  const captionBox = { x: cell.x, y: photoBox.y + photoBox.height, width: cell.width, height: fitted.boxHeight };

  doc.rect(photoBox.x, photoBox.y, photoBox.width, photoBox.height);
  doc.rect(captionBox.x, captionBox.y, captionBox.width, captionBox.height);
  fitImage(doc, dataUrl, photoBox);
  drawCaptionLines(doc, fitted, captionBox, "center");
}

export function photoCaptionText(photo: PhotoItem): string {
  return `${photo.order} - ${photo.caption?.trim() || "Sem legenda"}`;
}

export function drawPhotosSection(
  doc: jsPDF,
  photos: PhotoItem[],
  cursor: PageCursor,
  options: PdfOptions = DEFAULT_PDF_OPTIONS,
  captionPosition: CaptionPosition = CAPTION_POSITION,
): void {
  const frame = computeGridFrame(options);
  // Slots of the current page, row-major: [top-left, top-right, bottom-left, bottom-right].
  let used = [false, false, false, false];

  function goToFreshPage(): void {
    newPage(doc, cursor, options);
    used = [false, false, false, false];
  }

  photos.forEach((photo) => {
    const text = photoCaptionText(photo);

    if (photo.size === "full") {
      if (used.some(Boolean)) goToFreshPage();
      drawCell(doc, { x: frame.x, y: frame.y, width: frame.width, height: frame.height }, photo.dataUrl, text, captionPosition);
      used = [true, true, true, true];
      return;
    }

    if (photo.size === "half") {
      let col = [0, 1].find((c) => !used[c] && !used[c + 2]);
      if (col === undefined) {
        goToFreshPage();
        col = 0;
      }
      drawCell(doc, halfColumnRect(frame, col), photo.dataUrl, text, captionPosition);
      used[col] = true;
      used[col + 2] = true;
      return;
    }

    // "quarter", and the fallback for legacy data with no/invalid size:
    // next free slot, left to right, top to bottom.
    let slot = used.indexOf(false);
    if (slot === -1) {
      goToFreshPage();
      slot = 0;
    }
    drawCell(doc, quarterSlotRect(frame, slot), photo.dataUrl, text, captionPosition);
    used[slot] = true;
  });
}
