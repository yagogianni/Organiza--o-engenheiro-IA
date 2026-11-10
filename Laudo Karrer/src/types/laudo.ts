export type PhotoSize = "quarter" | "half" | "full";

export interface PhotoItem {
  id: string;
  dataUrl: string; // compressed JPEG data URL, via imageCompression.ts
  caption: string;
  order: number; // 1-based, matches display/print order
  size: PhotoSize;
}

export interface PdfOptions {
  includeFooter: boolean; // faixa azul Karrer no rodapé de cada página
  includeTitle: boolean; // título "Registro Fotográfico" na primeira página
  numberPages: boolean; // "Página X de Y"
}

export interface PhotoReport {
  id: string;
  label?: string; // free-text nickname for the dashboard/list only — never printed
  photos: PhotoItem[];
  pdfOptions?: Partial<PdfOptions>; // absent on older reports — see resolvePdfOptions()
  status: "draft" | "completed";
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}
