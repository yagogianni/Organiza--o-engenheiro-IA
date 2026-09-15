import { useEffect, useState } from "react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { SparklesText } from "@/components/ui/sparkles-text";
import { GradientText } from "@/components/ui/gradient-text";
import { LaudoListItem } from "@/components/laudo/LaudoListItem";
import { getLaudos, deleteLaudo } from "@/lib/storage";
import type { LaudoData } from "@/types/laudo";

export default function Dashboard() {
  const [laudos, setLaudos] = useState<LaudoData[]>([]);

  useEffect(() => {
    setLaudos(getLaudos());
  }, []);

  function handleDelete(id: string) {
    deleteLaudo(id);
    setLaudos(getLaudos());
  }

  const total = laudos.length;
  const completed = laudos.filter((l) => l.status === "completed").length;
  const drafts = laudos.filter((l) => l.status === "draft").length;
  const lastGenerated = laudos
    .filter((l) => l.status === "completed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const recent = [...laudos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">
        <GradientText>Dashboard</GradientText>
      </h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AnimatedCard>
          <p className="text-sm text-slate-500">Total</p>
          <p data-testid="stat-total" className="text-2xl font-semibold text-karrer-navy">
            {total}
          </p>
        </AnimatedCard>
        <AnimatedCard>
          <p className="text-sm text-slate-500">Concluídos</p>
          <p data-testid="stat-completed" className="text-2xl font-semibold text-karrer-navy">
            {completed}
          </p>
        </AnimatedCard>
        <AnimatedCard>
          <p className="text-sm text-slate-500">Rascunhos</p>
          <p data-testid="stat-drafts" className="text-2xl font-semibold text-karrer-navy">
            {drafts}
          </p>
        </AnimatedCard>
        <AnimatedCard>
          <p className="text-sm text-slate-500">Último gerado</p>
          <p data-testid="stat-last" className="text-sm font-medium text-karrer-navy">
            {lastGenerated ? new Date(lastGenerated.updatedAt).toLocaleDateString("pt-BR") : "—"}
          </p>
        </AnimatedCard>
      </div>

      {laudos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
          <SparklesText className="text-lg text-karrer-navy">Crie seu primeiro laudo</SparklesText>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((laudo) => (
            <LaudoListItem key={laudo.id} laudo={laudo} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
