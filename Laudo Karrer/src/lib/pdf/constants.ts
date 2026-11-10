import type { PdfOptions } from "@/types/laudo";

export const KARRER_BLUE = "#1B3A6B";
export const KARRER_NAVY = "#0D2040";

/**
 * Onde a legenda fica em cada célula da grade:
 * - "bottom": caixa de legenda abaixo da foto (padrão atual)
 * - "side": foto à esquerda (~60% da célula) e legenda à direita (~40%)
 * Fica em "bottom" até confirmar com o cliente.
 */
export type CaptionPosition = "bottom" | "side";
export const CAPTION_POSITION: CaptionPosition = "bottom";

/**
 * Todas as medidas do PDF, em pontos (1 pt = 1/72 pol; 1 mm ≈ 2,835 pt).
 * A4 = 595,28 x 841,89 pt. Para encaixar no PDF do cliente, ajuste aqui.
 *
 * Grade 2x2 com rodapé ligado: 2 × 250 + 11 = 511 pt de largura (centralizada,
 * ≈ 42 pt de cada lado) e 2 × 342 + 17 = 701 pt de altura (de 70 até 771,
 * logo acima do rodapé, que começa em 784,89).
 */
export const PDF_LAYOUT = {
  page: { width: 595.28, height: 841.89 },

  /** Margem lateral do título e dos textos do rodapé. A grade é centralizada na página. */
  marginX: 42,
  /** Topo da grade de fotos (em todas as páginas, com ou sem título). */
  contentTop: 70,
  /** Margem inferior usada quando o rodapé está desligado. */
  bottomMarginWithoutFooter: 42,

  title: { text: "Registro Fotográfico", baselineY: 51, fontSize: 16 },

  footer: {
    height: 57,
    /** Posição inicial (y) da faixa azul = page.height − height. */
    top: 784.89,
    /** Espaço livre entre a grade e o topo da faixa azul. */
    gapAbove: 13,
    /** Linhas de texto, medidas a partir do topo da faixa. */
    companyLineOffsetY: 23,
    contactLineOffsetY: 40,
    companyFontSize: 11,
    contactFontSize: 9,
  },

  grid: {
    cellWidth: 250,
    /** Altura total da célula = foto (296) + legenda (46). */
    cellHeight: 342,
    /** Altura padrão da caixa de legenda; a da foto é cellHeight − captionHeight = 296. */
    captionHeight: 46,
    columnGap: 11,
    rowGap: 17,
  },

  caption: {
    fontSize: 9,
    /** Menor fonte aceita antes de crescer a caixa (ainda legível impressa). */
    minFontSize: 7,
    fontSizeStep: 0.5,
    lineHeightFactor: 1.15,
    paddingX: 6,
    paddingY: 4,
    /**
     * Teto da caixa de legenda (modo "bottom") como fração da altura da célula.
     * Acima disso a foto ficaria pequena demais; o texto é cortado com "…".
     */
    maxHeightRatio: 0.45,
  },

  /** Modo CAPTION_POSITION = "side": fração da largura da célula ocupada pela foto. */
  side: { photoWidthRatio: 0.6 },

  border: { color: "#334155", width: 0.85 },

  pageNumber: {
    fontSize: 8,
    /** Sem rodapé: distância da base da página até a linha do número. */
    offsetFromBottomWithoutFooter: 20,
  },
} as const;

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  includeFooter: true,
  includeTitle: true,
  numberPages: false,
};

export function resolvePdfOptions(options?: Partial<PdfOptions>): PdfOptions {
  return { ...DEFAULT_PDF_OPTIONS, ...options };
}
