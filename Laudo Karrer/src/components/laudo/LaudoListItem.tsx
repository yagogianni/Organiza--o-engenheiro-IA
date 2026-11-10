import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Download, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/laudo/ConfirmDeleteDialog";
import type { PhotoReport } from "@/types/laudo";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";
import { reportSubtitle, reportTitle } from "@/lib/reportTitle";

export interface LaudoListItemProps {
  laudo: PhotoReport;
  onDelete: (id: string) => void;
}

export function LaudoListItem({ laudo, onDelete }: LaudoListItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  function handleDownload() {
    if (isGenerating) return;
    setDownloadError(null);
    setIsGenerating(true);
    setTimeout(() => {
      try {
        downloadLaudoPdf(laudo);
      } catch {
        setDownloadError("Falha ao gerar o PDF. Tente novamente.");
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{reportTitle(laudo)}</p>
          <p className="text-sm text-slate-500">{reportSubtitle(laudo)}</p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={laudo.status === "completed" ? "bg-green-600" : "bg-amber-500"}>
            {laudo.status === "completed" ? "Concluído" : "Rascunho"}
          </Badge>

          {laudo.status === "draft" && (
            <Link
              to={`/novo-laudo/${laudo.id}`}
              aria-label="Editar laudo"
              className="text-slate-400 hover:text-karrer-blue"
            >
              <Pencil size={18} />
            </Link>
          )}
          <Link to={`/laudos/${laudo.id}`} aria-label="Ver laudo" className="text-slate-400 hover:text-karrer-blue">
            <Eye size={18} />
          </Link>
          <button
            type="button"
            aria-label={isGenerating ? "Gerando PDF" : "Baixar PDF"}
            onClick={handleDownload}
            disabled={isGenerating}
            className="text-slate-400 hover:text-karrer-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>
          <button
            type="button"
            aria-label="Excluir laudo"
            onClick={() => setConfirmOpen(true)}
            className="text-slate-400 hover:text-red-600"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {downloadError && <p className="mt-2 text-xs text-red-600">{downloadError}</p>}

      <ConfirmDeleteDialog open={confirmOpen} onOpenChange={setConfirmOpen} onConfirm={() => onDelete(laudo.id)} />
    </div>
  );
}
