import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { SparklesText } from "@/components/ui/sparkles-text";
import { LaudoListItem } from "@/components/laudo/LaudoListItem";
import type { PhotoReport } from "@/types/laudo";
import { getLaudos, deleteLaudo } from "@/lib/storage";

export default function LaudoList() {
  const [laudos, setLaudos] = useState<PhotoReport[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLaudos(getLaudos());
  }, []);

  function handleDelete(id: string) {
    deleteLaudo(id);
    setLaudos(getLaudos());
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return laudos;
    return laudos.filter((l) => (l.label ?? "").toLowerCase().includes(q));
  }, [laudos, query]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-karrer-navy">Meus Laudos</h1>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por apelido"
        className="mb-6"
        aria-label="Buscar laudos"
      />

      {laudos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
          <SparklesText className="text-lg text-karrer-navy">Crie seu primeiro laudo</SparklesText>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum laudo encontrado para "{query}".</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((laudo) => (
            <LaudoListItem key={laudo.id} laudo={laudo} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
