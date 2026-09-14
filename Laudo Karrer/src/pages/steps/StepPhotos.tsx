import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { compressImageFile } from "@/lib/imageCompression";
import type { PhotoItem } from "@/types/laudo";

export interface StepPhotosProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function renumber(photos: PhotoItem[]): PhotoItem[] {
  return photos.map((p, i) => ({ ...p, order: i + 1 }));
}

export function StepPhotos({ photos, onChange, onNext, onBack }: StepPhotosProps) {
  async function handleFilesSelected(files: File[]) {
    const newPhotos: PhotoItem[] = [];
    for (const file of files) {
      const dataUrl = await compressImageFile(file);
      newPhotos.push({ id: crypto.randomUUID(), dataUrl, caption: "", order: 0 });
    }
    onChange(renumber([...photos, ...newPhotos]));
  }

  function handleCaptionChange(id: string, caption: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  function handleRemove(id: string) {
    onChange(renumber(photos.filter((p) => p.id !== id)));
  }

  function handleRemoveAll() {
    onChange([]);
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Fotos</h2>

      <FileDropzone onFilesSelected={handleFilesSelected} className="mb-4" />

      {photos.length > 0 && (
        <>
          <div className="mb-4 space-y-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-2"
              >
                <img src={photo.dataUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
                <Badge className="bg-karrer-blue">{photo.order}</Badge>
                <Input
                  value={photo.caption}
                  onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                  placeholder="Legenda da foto"
                  className="flex-1"
                />
                <button
                  type="button"
                  aria-label={`Remover foto ${photo.order}`}
                  onClick={() => handleRemove(photo.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={handleRemoveAll} className="mb-6">
            Remover todas
          </Button>
        </>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="button" onClick={onNext} className="bg-karrer-blue hover:bg-karrer-lightblue">
          Avançar
        </Button>
      </div>
    </div>
  );
}
