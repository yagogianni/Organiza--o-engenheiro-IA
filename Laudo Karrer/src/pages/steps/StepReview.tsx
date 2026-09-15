import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { LAUDO_TYPE_LABELS, type LaudoData } from "@/types/laudo";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";

export interface StepReviewProps {
  laudo: LaudoData;
  saveError: string | null;
  onBack: () => void;
  onSaveDraft: () => void;
  onComplete: () => boolean;
}

export function StepReview({ laudo, saveError, onBack, onSaveDraft, onComplete }: StepReviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  function handleGeneratePdf() {
    if (isGenerating) return;
    const success = onComplete();
    if (!success) return;

    setDownloadError(null);
    setIsGenerating(true);
    // Defer the (synchronous, potentially slow) PDF generation to the next tick
    // so React can commit and paint the "Gerando PDF…" state first.
    setTimeout(() => {
      try {
        downloadLaudoPdf(laudo);
      } catch {
        // The laudo was already marked completed and saved above — only the
        // download itself failed, so the user should retry downloading, not
        // re-fill the form.
        setDownloadError(
          "O laudo foi salvo, mas o download do PDF falhou. Tente baixar novamente.",
        );
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Revisão</h2>

      <div className="mb-6 space-y-3">
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Tipo</h3>
          <Badge className="bg-karrer-blue">{LAUDO_TYPE_LABELS[laudo.type]}</Badge>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Cliente</h3>
          <p className="text-sm text-slate-600">{laudo.client.name || "—"}</p>
          <p className="text-sm text-slate-500">{laudo.client.document}</p>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Imóvel</h3>
          <p className="text-sm text-slate-600">{laudo.property.address || "—"}</p>
          <p className="text-sm text-slate-500">ART {laudo.property.artNumber}</p>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Fotos</h3>
          <p className="text-sm text-slate-600">{laudo.photos.length} foto(s) anexada(s)</p>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Conclusão</h3>
          <p className="text-sm text-slate-600">{laudo.conclusion || "—"}</p>
        </section>
      </div>

      {saveError && <p className="mb-4 text-sm text-red-600">{saveError}</p>}
      {downloadError && <p className="mb-4 text-sm text-red-600">{downloadError}</p>}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onSaveDraft}>
            Salvar rascunho
          </Button>
          <ShimmerButton onClick={handleGeneratePdf} disabled={isGenerating} background="#1B3A6B">
            {isGenerating ? "Gerando PDF…" : "Gerar PDF"}
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}
