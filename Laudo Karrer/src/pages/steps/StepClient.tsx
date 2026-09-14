import type { ClientData } from "@/types/laudo";

export interface StepClientProps {
  client: ClientData;
  onChange: (client: ClientData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepClient(_props: StepClientProps) {
  return <div>StepClient placeholder</div>;
}
