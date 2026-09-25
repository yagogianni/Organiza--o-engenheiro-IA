import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { LaudoListItem } from "@/components/laudo/LaudoListItem";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: "report-1",
    label: "Vistoria Rua das Flores",
    photos: [],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("LaudoListItem", () => {
  it("shows the label when present", () => {
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport({ label: "Vistoria Rua das Flores" })} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Vistoria Rua das Flores")).toBeInTheDocument();
  });

  it("falls back to a photo-count title when there is no label", () => {
    render(
      <MemoryRouter>
        <LaudoListItem
          laudo={makeReport({ label: undefined, photos: [{ id: "p1", dataUrl: "d", caption: "", order: 1, size: "quarter" }] })}
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Registro fotográfico — 1 foto(s)")).toBeInTheDocument();
  });

  it("shows an 'Editar laudo' link to the resume-editing route for a draft", () => {
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport({ status: "draft" })} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    const editLink = screen.getByRole("link", { name: /editar laudo/i });
    expect(editLink).toHaveAttribute("href", "/novo-laudo/report-1");
  });

  it("does not show an edit link for a completed laudo", () => {
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport({ status: "completed" })} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: /editar laudo/i })).not.toBeInTheDocument();
  });

  it("shows a loading label and disables the download button while generating, preventing a double click", async () => {
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: /baixar pdf/i });
    fireEvent.click(button);
    fireEvent.click(button); // simulate an impatient double click

    await waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(1));
  });

  it("shows an error message when the PDF download fails", async () => {
    vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {
      throw new Error("boom");
    });
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));

    await waitFor(() => expect(screen.getByText(/falha ao gerar o pdf/i)).toBeInTheDocument());
  });
});
