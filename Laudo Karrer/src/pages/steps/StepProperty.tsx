import type { PropertyData } from "@/types/laudo";

export interface StepPropertyProps {
  property: PropertyData;
  onChange: (property: PropertyData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepProperty(_props: StepPropertyProps) {
  return <div>StepProperty placeholder</div>;
}
