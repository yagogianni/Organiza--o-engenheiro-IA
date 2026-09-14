import type { LaudoData } from "@/types/laudo";

export interface StepReviewProps {
  laudo: LaudoData;
  saveError: string | null;
  onBack: () => void;
  onSaveDraft: () => void;
  onComplete: () => boolean;
}

export function StepReview(_props: StepReviewProps) {
  return <div>StepReview placeholder</div>;
}
