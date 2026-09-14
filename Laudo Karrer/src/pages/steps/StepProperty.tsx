import { useState, type FormEvent } from "react";
import type { PropertyData } from "@/types/laudo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export interface StepPropertyProps {
  property: PropertyData;
  onChange: (property: PropertyData) => void;
  onNext: () => void;
  onBack: () => void;
}

const UFS: { value: string; label: string }[] = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

export function StepProperty({ property, onChange, onNext, onBack }: StepPropertyProps) {
  const [touched, setTouched] = useState(false);
  const isValid = property.artNumber.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (isValid) onNext();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Dados do imóvel</h2>

      <label htmlFor="property-address" className="mb-1 block text-sm font-medium text-slate-700">
        Endereço
      </label>
      <Input
        id="property-address"
        value={property.address}
        onChange={(e) => onChange({ ...property, address: e.target.value })}
        className="mb-4"
      />

      <label htmlFor="property-neighborhood" className="mb-1 block text-sm font-medium text-slate-700">
        Bairro
      </label>
      <Input
        id="property-neighborhood"
        value={property.neighborhood}
        onChange={(e) => onChange({ ...property, neighborhood: e.target.value })}
        className="mb-4"
      />

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="property-city" className="mb-1 block text-sm font-medium text-slate-700">
            Cidade
          </label>
          <Input
            id="property-city"
            value={property.city}
            onChange={(e) => onChange({ ...property, city: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="property-state" className="mb-1 block text-sm font-medium text-slate-700">
            Estado
          </label>
          <Select value={property.state} onValueChange={(value) => onChange({ ...property, state: value })}>
            <SelectTrigger id="property-state">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {UFS.map((uf) => (
                <SelectItem key={uf.value} value={uf.value}>
                  {uf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label htmlFor="property-date" className="mb-1 block text-sm font-medium text-slate-700">
        Data da vistoria
      </label>
      <Input
        id="property-date"
        type="date"
        value={property.inspectionDate}
        onChange={(e) => onChange({ ...property, inspectionDate: e.target.value })}
        className="mb-4"
      />

      <label htmlFor="property-art" className="mb-1 block text-sm font-medium text-slate-700">
        Número ART
      </label>
      <Input
        id="property-art"
        value={property.artNumber}
        onChange={(e) => onChange({ ...property, artNumber: e.target.value })}
        className="mb-1"
      />
      <p className="mb-3 min-h-[1.25rem] text-sm text-red-600">
        {touched && !isValid ? "Este campo é obrigatório." : ""}
      </p>

      <label htmlFor="property-description" className="mb-1 block text-sm font-medium text-slate-700">
        Descrição do imóvel
      </label>
      <Textarea
        id="property-description"
        value={property.description}
        onChange={(e) => onChange({ ...property, description: e.target.value })}
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
