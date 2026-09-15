import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { LaudoListItem } from "@/components/laudo/LaudoListItem";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { LaudoData } from "@/types/laudo";

function makeLaudo(overrides: Partial<LaudoData> = {}): LaudoData {
  return {
    id: "laudo-1",
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

afterEach(() => vi.restoreAllMocks());

describe("LaudoListItem", () => {
  it("shows an 'Editar laudo' link to the resume-editing route for a draft", () => {
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeLaudo({ status: "draft" })} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    const editLink = screen.getByRole("link", { name: /editar laudo/i });
    expect(editLink).toHaveAttribute("href", "/novo-laudo/laudo-1");
  });

  it("does not show an edit link for a completed laudo", () => {
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeLaudo({ status: "completed" })} onDelete={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: /editar laudo/i })).not.toBeInTheDocument();
  });

  it("shows a loading label and disables the download button while generating, preventing a double click", async () => {
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(
      <MemoryRouter>
        <LaudoListItem laudo={makeLaudo()} onDelete={vi.fn()} />
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
        <LaudoListItem laudo={makeLaudo()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));

    await waitFor(() => expect(screen.getByText(/falha ao gerar o pdf/i)).toBeInTheDocument());
  });
});
