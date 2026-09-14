import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Tipo", "Cliente", "Imóvel", "Fotos", "Conclusão", "Revisão"];

interface ProgressBarProps {
  currentStep: number;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <ol className="mb-8 flex items-center">
      {STEP_LABELS.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  isActive && !isCompleted && "border-karrer-blue text-karrer-blue",
                  !isActive && !isCompleted && "border-slate-300 text-slate-400",
                )}
              >
                {isCompleted ? <Check size={16} /> : index + 1}
              </div>
              <span className="hidden text-xs text-slate-500 sm:block">{label}</span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div className={cn("mx-2 h-0.5 flex-1", isCompleted ? "bg-green-500" : "bg-slate-200")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
