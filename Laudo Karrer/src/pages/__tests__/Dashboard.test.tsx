import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Dashboard from "@/pages/Dashboard";
import { saveLaudo } from "@/lib/storage";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: crypto.randomUUID(),
    label: "Registro 1",
    photos: [],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("Dashboard", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state when there are no laudos", () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });

  it("shows correct stat counts and the recent laudo list", () => {
    saveLaudo(makeReport({ id: "1", status: "completed" }));
    saveLaudo(makeReport({ id: "2", status: "draft" }));
    saveLaudo(makeReport({ id: "3", status: "draft" }));

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(screen.getByTestId("stat-total")).toHaveTextContent("3");
    expect(screen.getByTestId("stat-completed")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-drafts")).toHaveTextContent("2");
    expect(screen.getAllByText("Registro 1")).toHaveLength(3);
  });

  it("downloads the PDF when clicking the download action", async () => {
    saveLaudo(makeReport({ id: "1" }));
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    await waitFor(() => expect(downloadSpy).toHaveBeenCalled());
  });

  it("deletes a laudo after confirming the dialog", () => {
    saveLaudo(makeReport({ id: "1" }));
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /excluir laudo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });
});
