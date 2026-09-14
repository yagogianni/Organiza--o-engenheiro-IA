export type LaudoType = "vistoria_cautelar" | "laudo_tecnico" | "orcamento";

export interface ClientData {
  name: string;
  document: string; // CPF or CNPJ, masked
  address: string;
  email?: string;
}

export interface PropertyData {
  address: string;
  neighborhood: string;
  city: string;
  state: string; // UF, e.g. "SC"
  inspectionDate: string; // ISO date string, e.g. "2026-09-14"
  artNumber: string;
  description: string;
}

export interface PhotoItem {
  id: string;
  dataUrl: string; // compressed JPEG data URL
  caption: string;
  order: number; // 1-based, matches display order
}

export interface LaudoData {
  id: string;
  type: LaudoType;
  client: ClientData;
  property: PropertyData;
  photos: PhotoItem[];
  conclusion: string;
  notes?: string;
  status: "draft" | "completed";
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export const LAUDO_TYPE_LABELS: Record<LaudoType, string> = {
  vistoria_cautelar: "Laudo de Vistoria Cautelar",
  laudo_tecnico: "Laudo Técnico",
  orcamento: "Orçamento",
};
