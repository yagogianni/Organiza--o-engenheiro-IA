import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LAUDO_TYPE_LABELS, type LaudoData } from "@/types/laudo";
import { getLaudo, saveLaudo, deleteLaudo, StorageQuotaError } from "@/lib/storage";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";

export default function LaudoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [laudo, setLaudo] = useState<LaudoData | undefined>(undefined);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (id) setLaudo(getLaudo(id));
  }, [id]);

  if (!laudo) {
    return <p className="text-sm text-slate-500">Laudo não encontrado.</p>;
  }

  function handleStartEditNotes() {
    setNotesDraft(laudo!.notes ?? "");
    setNotesError(null);
    setEditingNotes(true);
  }

  function handleSaveNotes() {
    const updated = { ...laudo!, notes: notesDraft };
    try {
      saveLaudo(updated);
      setLaudo(updated);
      setEditingNotes(false);
      setNotesError(null);
    } catch (err) {
      setNotesError(err instanceof StorageQuotaError ? err.message : "Erro ao salvar as notas.");
    }
  }

  function handleDelete() {
    deleteLaudo(laudo!.id);
    navigate("/laudos");
  }

  function handleDownload() {
    if (isGenerating) return;
    setDownloadError(null);
    setIsGenerating(true);
    // Defer the (synchronous, potentially slow) PDF generation to the next tick
    // so React can commit and paint the "Gerando PDF…" state first.
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

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-karrer-navy">{laudo.client.name || "Sem nome"}</h1>
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

      <dl className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-500">Tipo</dt>
          <dd className="font-medium text-slate-800">{LAUDO_TYPE_LABELS[laudo.type]}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Imóvel</dt>
          <dd className="font-medium text-slate-800">{laudo.property.address || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">ART</dt>
          <dd className="font-medium text-slate-800">{laudo.property.artNumber || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Fotos</dt>
          <dd className="font-medium text-slate-800">{laudo.photos.length}</dd>
        </div>
      </dl>

      <div className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Conclusão</h2>
        <p className="text-sm text-slate-600">{laudo.conclusion || "—"}</p>
      </div>

      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Notas Técnicas</h2>
          {!editingNotes && (
            <Button type="button" variant="outline" onClick={handleStartEditNotes}>
              Editar notas
            </Button>
          )}
        </div>
        {editingNotes ? (
          <>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingNotes(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveNotes}
                className="bg-karrer-blue hover:bg-karrer-lightblue"
              >
                Salvar notas
              </Button>
            </div>
            {notesError && <p className="mt-2 text-sm text-red-600">{notesError}</p>}
          </>
        ) : (
          <p className="text-sm text-slate-600">{laudo.notes || "—"}</p>
        )}
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
