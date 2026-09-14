import type { LaudoData } from "@/types/laudo";

const STORAGE_KEY = "karrer_laudos";

export class StorageQuotaError extends Error {
  constructor() {
    super("Espaço de armazenamento cheio. Baixe o PDF e exclua rascunhos antigos.");
    this.name = "StorageQuotaError";
  }
}

export function getLaudos(): LaudoData[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LaudoData[];
  } catch {
    return [];
  }
}

export function getLaudo(id: string): LaudoData | undefined {
  return getLaudos().find((l) => l.id === id);
}

export function saveLaudo(laudo: LaudoData): void {
  const laudos = getLaudos();
  const index = laudos.findIndex((l) => l.id === laudo.id);
  const updated: LaudoData = { ...laudo, updatedAt: new Date().toISOString() };

  if (index >= 0) {
    laudos[index] = updated;
  } else {
    laudos.push(updated);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(laudos));
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      throw new StorageQuotaError();
    }
    throw err;
  }
}

export function deleteLaudo(id: string): void {
  const laudos = getLaudos().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(laudos));
}
