import { useState, type FormEvent } from "react";
import { Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export interface StepConclusionProps {
  conclusion: string;
  notes?: string;
  onChangeConclusion: (v: string) => void;
  onChangeNotes: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepConclusion({
  conclusion,
  notes,
  onChangeConclusion,
  onChangeNotes,
  onNext,
  onBack,
}: StepConclusionProps) {
  const [touched, setTouched] = useState(false);
  const isValid = conclusion.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (isValid) onNext();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Conclusão</h2>

      <label htmlFor="conclusion" className="mb-1 block text-sm font-medium text-slate-700">
        Conclusão
      </label>
      <Textarea
        id="conclusion"
        value={conclusion}
        onChange={(e) => onChangeConclusion(e.target.value)}
        className="mb-1"
        rows={6}
      />
      <p className="mb-4 min-h-[1.25rem] text-sm text-red-600">
        {touched && !isValid ? "Este campo é obrigatório." : ""}
      </p>

      <TooltipProvider>
        <div className="mb-1 flex items-center gap-2">
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Notas Técnicas
          </label>
          <Tooltip>
            <TooltipTrigger type="button" aria-label="O que são Notas Técnicas?">
              <Info size={14} className="text-slate-400" />
            </TooltipTrigger>
            <TooltipContent>
              Observações internas, medições, referências de norma — aparecem no PDF antes da
              conclusão
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <Textarea
        id="notes"
        value={notes ?? ""}
        onChange={(e) => onChangeNotes(e.target.value)}
        className="mb-2"
        rows={4}
      />
      <p className="mb-6 text-xs text-slate-400">
        Instrumentos, Glossário e Referências são incluídos automaticamente no PDF.
      </p>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit" className="bg-karrer-blue hover:bg-karrer-lightblue">
          Avançar
        </Button>
      </div>
    </form>
  );
}
