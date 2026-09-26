import { useParams } from "react-router-dom";
import { useState } from "react";
import { useLaudoForm } from "@/hooks/useLaudoForm";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { PhotoRow } from "@/components/laudo/PhotoRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { compressImageFile } from "@/lib/imageCompression";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";
import type { PhotoItem } from "@/types/laudo";

export default function NewLaudo() {
  const { id } = useParams<{ id: string }>();
  // Keying on `id` forces a full remount when navigating between
  // /novo-laudo, /novo-laudo/:id, or between two different :id values
  // client-side (no page reload) — without it, React reuses the same
  // component instance and useLaudoForm's lazy useState initializer never
  // re-runs, leaking a previously-loaded draft into what the user believes
  // is a fresh registro.
  return <NewLaudoScreen key={id ?? "new"} id={id} />;
}

function NewLaudoScreen({ id }: { id?: string }) {
  const form = useLaudoForm(id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFilesSelected(files: File[]) {
    setUploadError(null);
    setIsCompressing(true);
    const newPhotos: PhotoItem[] = [];
    let failedCount = 0;
    for (const file of files) {
      try {
        const dataUrl = await compressImageFile(file);
        newPhotos.push({ id: crypto.randomUUID(), dataUrl, caption: "", order: 0, size: "quarter" });
      } catch {
        failedCount += 1;
      }
    }
    if (newPhotos.length > 0) form.addPhotos(newPhotos);
    if (failedCount > 0) {
      setUploadError(
        failedCount === 1
          ? "1 arquivo não pôde ser processado e foi ignorado."
          : `${failedCount} arquivos não puderam ser processados e foram ignorados.`,
      );
    }
    setIsCompressing(false);
  }

  function handleGeneratePdf() {
    if (isGenerating) return;
    form.complete(); // may fail on storage quota — form.saveError already communicates that; we still generate the PDF below regardless.

    setDownloadError(null);
    setIsGenerating(true);
    // Defer to the next tick so React can paint the "Gerando PDF…" state
    // before the synchronous PDF build blocks the main thread.
    setTimeout(() => {
      try {
        downloadLaudoPdf(form.report);
      } catch {
        setDownloadError("O download do PDF falhou. Tente novamente.");
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold text-karrer-navy">
        {id ? "Editar Registro Fotográfico" : "Novo Registro Fotográfico"}
      </h1>

      <label htmlFor="report-label" className="mb-1 block text-sm font-medium text-slate-700">
        Apelido (opcional, só para você localizar depois — não aparece no PDF)
      </label>
      <Input
        id="report-label"
        value={form.report.label ?? ""}
        onChange={(e) => form.updateLabel(e.target.value)}
        className="mb-6"
        placeholder="Ex: Vistoria Rua Libéria 825"
      />

      <FileDropzone onFilesSelected={handleFilesSelected} className="mb-4" />

      {form.report.photos.length > 0 && (
        <>
          <div className="mb-4 space-y-2">
            {form.report.photos.map((photo, index) => (
              <PhotoRow
                key={photo.id}
                photo={photo}
                isFirst={index === 0}
                isLast={index === form.report.photos.length - 1}
                onCaptionChange={(caption) => form.updateCaption(photo.id, caption)}
                onSizeChange={(size) => form.updateSize(photo.id, size)}
                onMoveUp={() => form.movePhoto(photo.id, "up")}
                onMoveDown={() => form.movePhoto(photo.id, "down")}
                onRemove={() => form.removePhoto(photo.id)}
              />
            ))}
          </div>
          <Button type="button" variant="outline" onClick={form.removeAllPhotos} className="mb-6">
            Remover todas
          </Button>
        </>
      )}

      {form.saveError && <p className="mb-4 text-sm text-red-600">{form.saveError}</p>}
      {downloadError && <p className="mb-4 text-sm text-red-600">{downloadError}</p>}
      {uploadError && <p className="mb-4 text-sm text-red-600">{uploadError}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={form.saveDraft}>
          Salvar rascunho
        </Button>
        <ShimmerButton
          onClick={handleGeneratePdf}
          disabled={isGenerating || isCompressing || form.report.photos.length === 0}
          background="#1B3A6B"
        >
          {isGenerating ? "Gerando PDF…" : "Gerar PDF"}
        </ShimmerButton>
      </div>
    </div>
  );
}
