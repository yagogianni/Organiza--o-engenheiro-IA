import type { LaudoData, LaudoType } from "@/types/laudo";

export interface StepTypeProps {
  laudo: LaudoData;
  onSelectType: (type: LaudoType) => void;
}

export function StepType(_props: StepTypeProps) {
  return <div>StepType placeholder</div>;
}
