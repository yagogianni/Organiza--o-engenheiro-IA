import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import LaudoDetail from "@/pages/LaudoDetail";
import { saveLaudo, getLaudo } from "@/lib/storage";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { LaudoData } from "@/types/laudo";

function makeLaudo(overrides: Partial<LaudoData> = {}): LaudoData {
  return {
    id: "laudo-1",
    type: "laudo_tecnico",
    client: { name: "Carlos Dias", document: "", address: "" },
    property: {
      address: "Rua Y, 20",
      neighborhood: "",
      city: "",
      state: "",
      inspectionDate: "",
      artNumber: "ART-99",
      description: "",
    },
    photos: [],
    conclusion: "Está tudo certo.",
    notes: "",
    status: "draft",
    createdAt: "2026-09-14T10:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/laudos/${id}`]}>
      <Routes>
        <Route path="/laudos/:id" element={<LaudoDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LaudoDetail", () => {
  beforeEach(() => localStorage.clear());

  it("shows a not-found message for an unknown id", () => {
    renderDetail("does-not-exist");
    expect(screen.getByText(/laudo não encontrado/i)).toBeInTheDocument();
  });

  it("renders the laudo's details", () => {
    saveLaudo(makeLaudo());
    renderDetail("laudo-1");
    expect(screen.getByText("Carlos Dias")).toBeInTheDocument();
    expect(screen.getByText("Está tudo certo.")).toBeInTheDocument();
    expect(screen.getByText("ART-99")).toBeInTheDocument();
  });

  it("downloads the PDF when clicking Baixar PDF", () => {
    saveLaudo(makeLaudo());
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    renderDetail("laudo-1");

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    expect(downloadSpy).toHaveBeenCalled();
  });

  it("edits and saves the technical notes", () => {
    saveLaudo(makeLaudo({ notes: "Nota original" }));
    renderDetail("laudo-1");

    fireEvent.click(screen.getByRole("button", { name: /editar notas/i }));
    const textarea = screen.getByDisplayValue("Nota original");
    fireEvent.change(textarea, { target: { value: "Nota atualizada" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar notas/i }));

    expect(screen.getByText("Nota atualizada")).toBeInTheDocument();
    expect(getLaudo("laudo-1")?.notes).toBe("Nota atualizada");
  });

  it("deletes the laudo after confirming the dialog", () => {
    saveLaudo(makeLaudo());
    renderDetail("laudo-1");

    fireEvent.click(screen.getByRole("button", { name: /excluir laudo/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(getLaudo("laudo-1")).toBeUndefined();
  });
});
