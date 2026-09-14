import { useState, type FormEvent } from "react";
import type { ClientData } from "@/types/laudo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { maskCpfCnpj } from "@/lib/masks";

export interface StepClientProps {
  client: ClientData;
  onChange: (client: ClientData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepClient({ client, onChange, onNext, onBack }: StepClientProps) {
  const [touched, setTouched] = useState(false);
  const isValid = client.name.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (isValid) onNext();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Dados do cliente</h2>

      <label htmlFor="client-name" className="mb-1 block text-sm font-medium text-slate-700">
        Nome completo / Razão social
      </label>
      <Input
        id="client-name"
        value={client.name}
        onChange={(e) => onChange({ ...client, name: e.target.value })}
        className="mb-1"
      />
      <p className="mb-3 min-h-[1.25rem] text-sm text-red-600">
        {touched && !isValid ? "Este campo é obrigatório." : ""}
      </p>

      <label htmlFor="client-document" className="mb-1 block text-sm font-medium text-slate-700">
        CPF/CNPJ
      </label>
      <Input
        id="client-document"
        value={client.document}
        onChange={(e) => onChange({ ...client, document: maskCpfCnpj(e.target.value) })}
        className="mb-4"
      />

      <label htmlFor="client-address" className="mb-1 block text-sm font-medium text-slate-700">
        Endereço
      </label>
      <Input
        id="client-address"
        value={client.address}
        onChange={(e) => onChange({ ...client, address: e.target.value })}
        className="mb-4"
      />

      <label htmlFor="client-email" className="mb-1 block text-sm font-medium text-slate-700">
        Email (opcional)
      </label>
      <Input
        id="client-email"
        type="email"
        value={client.email ?? ""}
        onChange={(e) => onChange({ ...client, email: e.target.value })}
        className="mb-6"
      />

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
