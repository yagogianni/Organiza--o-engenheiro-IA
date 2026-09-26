import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { PhotoReport } from "@/types/laudo";
import { getLaudo, deleteLaudo } from "@/lib/storage";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";

export default function LaudoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [laudo, setLaudo] = useState<PhotoReport | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (id) setLaudo(getLaudo(id));
  }, [id]);

  if (!laudo) {
    return <p className="text-sm text-slate-500">Laudo não encontrado.</p>;
  }

  function handleDelete() {
    deleteLaudo(laudo!.id);
    navigate("/laudos");
  }

  function handleDownload() {
    if (isGenerating) return;
    setDownloadError(null);
    setIsGenerating(true);
    setTimeout(() => {
      try {
        downloadLaudoPdf(laudo!);
      } catch {
        setDownloadError("Não foi possível gerar o PDF. Tente novamente.");
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  }

  const title = laudo.label?.trim() || `Registro fotográfico — ${laudo.photos.length} foto(s)`;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-karrer-navy">{title}</h1>
        <div className="flex items-center gap-3">
          <Badge className={laudo.status === "completed" ? "bg-green-600" : "bg-amber-500"}>
            {laudo.status === "completed" ? "Concluído" : "Rascunho"}
          </Badge>
          {laudo.status === "draft" && (
            <Link to={`/novo-laudo/${laudo.id}`}>
              <Button type="button" variant="outline">
                Continuar editando
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Fotos ({laudo.photos.length})</h2>
        <div className="space-y-2">
          {laudo.photos.map((photo) => (
            <div key={photo.id} className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-2">
              <img src={photo.dataUrl} alt="" className="h-16 w-16 rounded-md object-cover" />
              <p className="text-sm text-slate-600">{photo.caption || "Sem legenda"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={handleDownload}
          disabled={isGenerating}
          className="bg-karrer-blue hover:bg-karrer-lightblue"
        >
          {isGenerating ? "Gerando PDF…" : "Baixar PDF"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)}>
          Excluir laudo
        </Button>
      </div>
      {downloadError && <p className="mt-2 text-sm text-red-600">{downloadError}</p>}

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
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
