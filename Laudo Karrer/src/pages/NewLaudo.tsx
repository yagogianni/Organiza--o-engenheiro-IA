import { useParams } from "react-router-dom";
import { useLaudoForm } from "@/hooks/useLaudoForm";
import { ProgressBar } from "@/components/form/ProgressBar";
import { StepType } from "@/pages/steps/StepType";
import { StepClient } from "@/pages/steps/StepClient";
import { StepProperty } from "@/pages/steps/StepProperty";
import { StepPhotos } from "@/pages/steps/StepPhotos";
import { StepConclusion } from "@/pages/steps/StepConclusion";
import { StepReview } from "@/pages/steps/StepReview";

export default function NewLaudo() {
  const { id } = useParams<{ id: string }>();
  // Keying on `id` forces a full remount when navigating between
  // /novo-laudo, /novo-laudo/:id, or between two different :id values
  // client-side (no page reload) — without it, React reuses the same
  // component instance and useLaudoForm's lazy useState initializer
  // never re-runs, leaking a previously-loaded draft's data/step into
  // what the user believes is a fresh laudo (or a different draft).
  return <NewLaudoForm key={id ?? "new"} id={id} />;
}

function NewLaudoForm({ id }: { id?: string }) {
  const form = useLaudoForm(id);

  return (
    <div className="mx-auto max-w-3xl">
      <ProgressBar currentStep={form.step} />

      {form.step === 0 && (
        <StepType
          laudo={form.laudo}
          onSelectType={(type) => {
            form.updateType(type);
            form.next();
          }}
        />
      )}
      {form.step === 1 && (
        <StepClient
          client={form.laudo.client}
          onChange={form.updateClient}
          onNext={form.next}
          onBack={form.back}
        />
      )}
      {form.step === 2 && (
        <StepProperty
          property={form.laudo.property}
          onChange={form.updateProperty}
          onNext={form.next}
          onBack={form.back}
        />
      )}
      {form.step === 3 && (
        <StepPhotos
          photos={form.laudo.photos}
          onChange={form.updatePhotos}
          onNext={form.next}
          onBack={form.back}
        />
      )}
      {form.step === 4 && (
        <StepConclusion
          conclusion={form.laudo.conclusion}
          notes={form.laudo.notes}
          onChangeConclusion={form.updateConclusion}
          onChangeNotes={form.updateNotes}
          onNext={form.next}
          onBack={form.back}
        />
      )}
      {form.step === 5 && (
        <StepReview
          laudo={form.laudo}
          saveError={form.saveError}
          onBack={form.back}
          onSaveDraft={form.saveDraft}
          onComplete={form.complete}
        />
      )}
    </div>
  );
}
