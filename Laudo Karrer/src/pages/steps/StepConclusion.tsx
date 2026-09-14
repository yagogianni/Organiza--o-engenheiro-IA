export interface StepConclusionProps {
  conclusion: string;
  notes?: string;
  onChangeConclusion: (v: string) => void;
  onChangeNotes: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepConclusion(_props: StepConclusionProps) {
  return <div>StepConclusion placeholder</div>;
}
