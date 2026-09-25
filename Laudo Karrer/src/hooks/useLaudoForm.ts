import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PhotoItem, PhotoReport, PhotoSize } from "@/types/laudo";
import { getLaudo, saveLaudo, StorageQuotaError } from "@/lib/storage";

function emptyReport(): PhotoReport {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), label: "", photos: [], status: "draft", createdAt: now, updatedAt: now };
}

function renumber(photos: PhotoItem[]): PhotoItem[] {
  return photos.map((p, i) => ({ ...p, order: i + 1 }));
}

export function useLaudoForm(id?: string) {
  const navigate = useNavigate();
  const [report, setReport] = useState<PhotoReport>(() => (id ? (getLaudo(id) ?? emptyReport()) : emptyReport()));
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateLabel = useCallback((label: string) => setReport((r) => ({ ...r, label })), []);

  const addPhotos = useCallback((newPhotos: PhotoItem[]) => {
    setReport((r) => ({ ...r, photos: renumber([...r.photos, ...newPhotos]) }));
  }, []);

  const updateCaption = useCallback((id: string, caption: string) => {
    setReport((r) => ({ ...r, photos: r.photos.map((p) => (p.id === id ? { ...p, caption } : p)) }));
  }, []);

  const updateSize = useCallback((id: string, size: PhotoSize) => {
    setReport((r) => ({ ...r, photos: r.photos.map((p) => (p.id === id ? { ...p, size } : p)) }));
  }, []);

  const removePhoto = useCallback((id: string) => {
    setReport((r) => ({ ...r, photos: renumber(r.photos.filter((p) => p.id !== id)) }));
  }, []);

  const removeAllPhotos = useCallback(() => {
    setReport((r) => ({ ...r, photos: [] }));
  }, []);

  const movePhoto = useCallback((id: string, direction: "up" | "down") => {
    setReport((r) => {
      const index = r.photos.findIndex((p) => p.id === id);
      if (index === -1) return r;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= r.photos.length) return r;
      const photos = [...r.photos];
      [photos[index], photos[targetIndex]] = [photos[targetIndex], photos[index]];
      return { ...r, photos: renumber(photos) };
    });
  }, []);

  const persist = useCallback(
    (status: "draft" | "completed") => {
      setSaveError(null);
      const toSave: PhotoReport = { ...report, status };
      try {
        saveLaudo(toSave);
        setReport(toSave);
        return true;
      } catch (err) {
        setSaveError(err instanceof StorageQuotaError ? err.message : "Erro ao salvar o registro.");
        return false;
      }
    },
    [report],
  );

  function saveDraft() {
    if (persist("draft")) navigate("/laudos");
  }

  function complete() {
    return persist("completed");
  }

  return {
    report,
    saveError,
    updateLabel,
    addPhotos,
    updateCaption,
    updateSize,
    removePhoto,
    removeAllPhotos,
    movePhoto,
    saveDraft,
    complete,
  };
}
