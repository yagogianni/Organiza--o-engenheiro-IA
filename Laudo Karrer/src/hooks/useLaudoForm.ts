import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ClientData, LaudoData, LaudoType, PhotoItem, PropertyData } from "@/types/laudo";
import { getLaudo, saveLaudo, StorageQuotaError } from "@/lib/storage";

export const STEP_COUNT = 6;

function emptyLaudo(): LaudoData {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: "vistoria_cautelar",
    client: { name: "", document: "", address: "", email: "" },
    property: {
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      inspectionDate: "",
      artNumber: "",
      description: "",
    },
    photos: [],
    conclusion: "",
    notes: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function useLaudoForm(id?: string) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [laudo, setLaudo] = useState<LaudoData>(() => (id ? (getLaudo(id) ?? emptyLaudo()) : emptyLaudo()));
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateType = useCallback((type: LaudoType) => setLaudo((l) => ({ ...l, type })), []);
  const updateClient = useCallback((client: ClientData) => setLaudo((l) => ({ ...l, client })), []);
  const updateProperty = useCallback(
    (property: PropertyData) => setLaudo((l) => ({ ...l, property })),
    [],
  );
  const updatePhotos = useCallback((photos: PhotoItem[]) => setLaudo((l) => ({ ...l, photos })), []);
  const updateConclusion = useCallback(
    (conclusion: string) => setLaudo((l) => ({ ...l, conclusion })),
    [],
  );
  const updateNotes = useCallback((notes: string) => setLaudo((l) => ({ ...l, notes })), []);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, STEP_COUNT - 1)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const goTo = useCallback(
    (target: number) => setStep(Math.max(0, Math.min(target, STEP_COUNT - 1))),
    [],
  );

  const persist = useCallback(
    (status: "draft" | "completed") => {
      setSaveError(null);
      const toSave: LaudoData = { ...laudo, status };
      try {
        saveLaudo(toSave);
        setLaudo(toSave);
        return true;
      } catch (err) {
        setSaveError(err instanceof StorageQuotaError ? err.message : "Erro ao salvar o laudo.");
        return false;
      }
    },
    [laudo],
  );

  function saveDraft() {
    if (persist("draft")) navigate("/laudos");
  }

  function complete() {
    return persist("completed");
  }

  return {
    step,
    laudo,
    saveError,
    updateType,
    updateClient,
    updateProperty,
    updatePhotos,
    updateConclusion,
    updateNotes,
    next,
    back,
    goTo,
    saveDraft,
    complete,
  };
}
