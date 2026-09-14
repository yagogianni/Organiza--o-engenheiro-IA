import { ClipboardCheck, FileText, Calculator, type LucideIcon } from "lucide-react";
import type { LaudoData, LaudoType } from "@/types/laudo";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";

export interface StepTypeProps {
  laudo: LaudoData;
  onSelectType: (type: LaudoType) => void;
}

interface TypeOption {
  type: LaudoType;
  title: string;
  description: string;
  icon: LucideIcon;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: "vistoria_cautelar",
    title: "Laudo de Vistoria Cautelar",
    description: "Registro do estado de imóveis vizinhos antes de uma obra.",
    icon: ClipboardCheck,
  },
  {
    type: "laudo_tecnico",
    title: "Laudo Técnico",
    description: "Parecer técnico de engenharia sobre um imóvel.",
    icon: FileText,
  },
  {
    type: "orcamento",
    title: "Orçamento",
    description: "Proposta de serviços de engenharia.",
    icon: Calculator,
  },
];

export function StepType({ laudo, onSelectType }: StepTypeProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">
        Que tipo de documento você vai gerar?
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {TYPE_OPTIONS.map(({ type, title, description, icon: Icon }) => (
          <div key={type} className="relative overflow-hidden rounded-xl">
            <SpotlightCard
              onClick={() => onSelectType(type)}
              className={cn(laudo.type === type && "ring-2 ring-karrer-blue")}
            >
              <Icon className="mb-3 text-karrer-blue" size={28} />
              <h3 className="mb-1 font-medium text-slate-800">{title}</h3>
              <p className="text-sm text-slate-500">{description}</p>
            </SpotlightCard>
            <BorderBeam className="pointer-events-none opacity-0 group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
