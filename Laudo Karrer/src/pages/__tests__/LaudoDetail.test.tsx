import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import LaudoDetail from "@/pages/LaudoDetail";
import { saveLaudo, getLaudo } from "@/lib/storage";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: "report-1",
    label: "Vistoria Rua Y",
    photos: [{ id: "p1", dataUrl: "data:1", caption: "Fachada", order: 1, size: "quarter" }],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
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
  afterEach(() => vi.restoreAllMocks());

  it("shows a not-found message for an unknown id", () => {
    renderDetail("does-not-exist");
    expect(screen.getByText(/laudo não encontrado/i)).toBeInTheDocument();
  });

  it("renders the report's label and photo list", () => {
    saveLaudo(makeReport());
    renderDetail("report-1");
    expect(screen.getByText("Vistoria Rua Y")).toBeInTheDocument();
    expect(screen.getByText("Fachada")).toBeInTheDocument();
  });

  it("falls back to a photo-count title when there is no label", () => {
    saveLaudo(makeReport({ label: undefined }));
    renderDetail("report-1");
    expect(screen.getByText("Registro fotográfico — 1 foto(s)")).toBeInTheDocument();
  });

  it("downloads the PDF when clicking Baixar PDF", async () => {
    saveLaudo(makeReport());
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    renderDetail("report-1");

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    await waitFor(() => expect(downloadSpy).toHaveBeenCalled());
  });

  it("shows an error and re-enables the button when the PDF download fails", async () => {
    saveLaudo(makeReport());
    vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {
      throw new Error("boom");
    });
    renderDetail("report-1");

    const button = screen.getByRole("button", { name: /baixar pdf/i });
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText(/não foi possível gerar o pdf/i)).toBeInTheDocument());
    expect(button).not.toBeDisabled();
  });

  it("deletes the laudo after confirming the dialog", () => {
    saveLaudo(makeReport());
    renderDetail("report-1");

    fireEvent.click(screen.getByRole("button", { name: /excluir laudo/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(getLaudo("report-1")).toBeUndefined();
  });
});
