import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PhotoItem, PhotoSize } from "@/types/laudo";

const SIZE_LABELS: Record<PhotoSize, string> = {
  quarter: "1/4",
  half: "1/2",
  full: "Página inteira",
};

export interface PhotoRowProps {
  photo: PhotoItem;
  isFirst: boolean;
  isLast: boolean;
  onCaptionChange: (caption: string) => void;
  onSizeChange: (size: PhotoSize) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function PhotoRow({
  photo,
  isFirst,
  isLast,
  onCaptionChange,
  onSizeChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: PhotoRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E2E8F0] p-2 sm:flex-nowrap">
      <img src={photo.dataUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
      <Badge className="bg-karrer-blue">{photo.order}</Badge>
      <Input
        value={photo.caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder="Legenda da foto"
        className="min-w-[140px] flex-1 sm:min-w-0"
      />
      <Select value={photo.size ?? "quarter"} onValueChange={(value) => onSizeChange(value as PhotoSize)}>
        <SelectTrigger aria-label={`Tamanho da foto ${photo.order}`} className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quarter">{SIZE_LABELS.quarter}</SelectItem>
          <SelectItem value="half">{SIZE_LABELS.half}</SelectItem>
          <SelectItem value="full">{SIZE_LABELS.full}</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex flex-col">
        <button
          type="button"
          aria-label={`Mover foto ${photo.order} para cima`}
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-slate-400 hover:text-karrer-blue disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          aria-label={`Mover foto ${photo.order} para baixo`}
          onClick={onMoveDown}
          disabled={isLast}
          className="text-slate-400 hover:text-karrer-blue disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronDown size={16} />
        </button>
      </div>
      <button
        type="button"
        aria-label={`Remover foto ${photo.order}`}
        onClick={onRemove}
        className="text-slate-400 hover:text-red-600"
      >
        <X size={18} />
      </button>
    </div>
  );
}
