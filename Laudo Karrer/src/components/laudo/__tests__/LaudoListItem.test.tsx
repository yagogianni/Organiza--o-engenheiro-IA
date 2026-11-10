import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { LaudoListItem } from "@/components/laudo/LaudoListItem";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import { formatDateTime } from "@/lib/reportTitle";
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

  it("shows the photo count and date/time only once, on the line below the title", () => {
    const laudo = makeReport({ photos: [{ id: "p1", dataUrl: "d", caption: "", order: 1, size: "quarter" }] });
    render(
      <MemoryRouter>
        <LaudoListItem laudo={laudo} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Vistoria Rua das Flores")).toBeInTheDocument();
    expect(screen.getByText(`1 foto(s) — ${formatDateTime(laudo.createdAt)}`)).toBeInTheDocument();
    expect(screen.getAllByText(/foto\(s\)/)).toHaveLength(1);
  });

  it("uses the date and time in the title when there is no label, to tell records apart", () => {
    const laudo = makeReport({ label: "  " });
    render(
      <MemoryRouter>
        <LaudoListItem laudo={laudo} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(`Registro fotográfico — ${formatDateTime(laudo.createdAt)}`)).toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and only deletes on confirm", () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeReport()} onDelete={onDelete} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /excluir laudo/i }));
    expect(screen.getByText("Excluir este registro?")).toBeInTheDocument();
    expect(screen.getByText("Essa ação não pode ser desfeita.")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onDelete).toHaveBeenCalledWith("report-1");
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
