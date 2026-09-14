import type { PhotoItem } from "@/types/laudo";

export interface StepPhotosProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepPhotos(_props: StepPhotosProps) {
  return <div>StepPhotos placeholder</div>;
}
