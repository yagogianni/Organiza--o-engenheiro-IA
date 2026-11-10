import type { PhotoReport } from "@/types/laudo";

/** "10/11/2026 às 14:32" (horário local). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("pt-BR");
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} às ${time}`;
}

/** Apelido, ou — sem apelido — "Registro fotográfico — data e hora", para diferenciar os registros. */
export function reportTitle(report: PhotoReport): string {
  return report.label?.trim() || `Registro fotográfico — ${formatDateTime(report.createdAt)}`;
}

/** "N foto(s) — data e hora". */
export function reportSubtitle(report: PhotoReport): string {
  return `${report.photos.length} foto(s) — ${formatDateTime(report.createdAt)}`;
}
