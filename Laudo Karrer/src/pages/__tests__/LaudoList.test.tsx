import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LaudoList from "@/pages/LaudoList";
import { saveLaudo } from "@/lib/storage";
import type { LaudoData } from "@/types/laudo";

function makeLaudo(overrides: Partial<LaudoData> = {}): LaudoData {
  return {
    id: crypto.randomUUID(),
    type: "vistoria_cautelar",
    client: { name: "João Pereira", document: "", address: "" },
    property: {
      address: "Rua das Flores, 10",
      neighborhood: "",
      city: "",
      state: "",
      inspectionDate: "",
      artNumber: "",
      description: "",
    },
    photos: [],
    conclusion: "",
    status: "draft",
    createdAt: "2026-09-14T10:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("LaudoList", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state when there are no laudos", () => {
    render(<MemoryRouter><LaudoList /></MemoryRouter>);
    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });

  it("lists all laudos by default", () => {
    saveLaudo(makeLaudo({ id: "1", client: { name: "João Pereira", document: "", address: "" } }));
    saveLaudo(makeLaudo({ id: "2", client: { name: "Ana Lima", document: "", address: "" } }));
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    expect(screen.getByText("João Pereira")).toBeInTheDocument();
    expect(screen.getByText("Ana Lima")).toBeInTheDocument();
  });

  it("filters in real time by client name", () => {
    saveLaudo(makeLaudo({ id: "1", client: { name: "João Pereira", document: "", address: "" } }));
    saveLaudo(makeLaudo({ id: "2", client: { name: "Ana Lima", document: "", address: "" } }));
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "ana" } });

    expect(screen.queryByText("João Pereira")).not.toBeInTheDocument();
    expect(screen.getByText("Ana Lima")).toBeInTheDocument();
  });

  it("filters in real time by property address", () => {
    const base = makeLaudo();
    saveLaudo({ ...base, id: "1", property: { ...base.property, address: "Rua das Flores, 10" } });
    saveLaudo({ ...base, id: "2", property: { ...base.property, address: "Avenida Central, 500" } });
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "central" } });

    expect(screen.getByText(/Avenida Central, 500/)).toBeInTheDocument();
    expect(screen.queryByText(/Rua das Flores, 10/)).not.toBeInTheDocument();
  });

  it("shows a no-results message when the search matches nothing", () => {
    saveLaudo(makeLaudo());
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "zzz-nao-existe" } });

    expect(screen.getByText(/nenhum laudo encontrado/i)).toBeInTheDocument();
  });
});
