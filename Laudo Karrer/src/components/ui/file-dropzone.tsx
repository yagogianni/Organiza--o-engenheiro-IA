import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
  accept?: string;
}

export function FileDropzone({ onFilesSelected, className, accept = "image/*" }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(fileList: FileList | File[] | null | undefined) {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "dropzone group relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white p-10 text-center transition-colors hover:border-karrer-lightblue",
        isDragging && "border-karrer-blue bg-karrer-lightblue/5",
        className,
      )}
    >
      <ImagePlus className="text-slate-400" size={32} />
      <p className="text-sm font-medium text-slate-600">
        Arraste fotos aqui ou clique para selecionar
      </p>
      <p className="text-xs text-slate-400">JPG, PNG — múltiplos arquivos permitidos</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleInputChange}
        className="hidden"
        aria-label="Selecionar fotos"
      />
      <div
        aria-hidden="true"
        className="dropzone-shimmer-bar pointer-events-none absolute inset-0 opacity-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />
    </div>
  );
}
