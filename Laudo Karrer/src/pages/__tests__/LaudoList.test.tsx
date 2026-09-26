import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LaudoList from "@/pages/LaudoList";
import { saveLaudo } from "@/lib/storage";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: crypto.randomUUID(),
    label: "Vistoria Rua X",
    photos: [],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("LaudoList", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state when there are no laudos", () => {
    render(<MemoryRouter><LaudoList /></MemoryRouter>);
    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });

  it("filters by label", () => {
    saveLaudo(makeReport({ label: "Vistoria Rua das Flores" }));
    saveLaudo(makeReport({ label: "Laudo Técnico Predial" }));
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "flores" } });

    expect(screen.getByText("Vistoria Rua das Flores")).toBeInTheDocument();
    expect(screen.queryByText("Laudo Técnico Predial")).not.toBeInTheDocument();
  });

  it("shows a not-found message when the search matches nothing", () => {
    saveLaudo(makeReport({ label: "Vistoria Rua das Flores" }));
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "zzz" } });

    expect(screen.getByText(/nenhum laudo encontrado/i)).toBeInTheDocument();
  });
});
