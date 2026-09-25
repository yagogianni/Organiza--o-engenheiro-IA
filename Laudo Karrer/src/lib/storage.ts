import type { PhotoReport } from "@/types/laudo";

const STORAGE_KEY = "karrer_laudos";

export class StorageQuotaError extends Error {
  constructor() {
    super("Espaço de armazenamento cheio. Baixe o PDF e exclua rascunhos antigos.");
    this.name = "StorageQuotaError";
  }
}

export function getLaudos(): PhotoReport[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PhotoReport[];
  } catch {
    return [];
  }
}

export function getLaudo(id: string): PhotoReport | undefined {
  return getLaudos().find((l) => l.id === id);
}

export function saveLaudo(report: PhotoReport): void {
  const reports = getLaudos();
  const index = reports.findIndex((l) => l.id === report.id);
  const updated: PhotoReport = { ...report, updatedAt: new Date().toISOString() };

  if (index >= 0) {
    reports[index] = updated;
  } else {
    reports.push(updated);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
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
  const reports = getLaudos().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}
