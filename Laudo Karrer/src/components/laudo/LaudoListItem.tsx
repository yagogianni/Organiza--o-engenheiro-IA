import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Download, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LAUDO_TYPE_LABELS, type LaudoData } from "@/types/laudo";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";

export interface LaudoListItemProps {
  laudo: LaudoData;
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
    // Defer the (synchronous, potentially slow) PDF generation to the next tick
    // so React can commit and paint the "Gerando PDF…" state first.
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
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-800">{laudo.client.name || "Sem nome"}</p>
          <p className="text-sm text-slate-500">
            {LAUDO_TYPE_LABELS[laudo.type]} — {laudo.property.address || "Sem endereço"}
          </p>
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
          <Link
            to={`/laudos/${laudo.id}`}
            aria-label="Ver laudo"
            className="text-slate-400 hover:text-karrer-blue"
          >
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir laudo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onDelete(laudo.id);
                setConfirmOpen(false);
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
