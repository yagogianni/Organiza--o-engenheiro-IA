import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { vi } from "vitest";
import NewLaudo from "@/pages/NewLaudo";
import { saveLaudo } from "@/lib/storage";
import * as imageCompression from "@/lib/imageCompression";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { PhotoReport } from "@/types/laudo";

function makeFile(name: string) {
  return new File(["fake"], name, { type: "image/jpeg" });
}

const draftWithLabel: PhotoReport = {
  id: "draft-1",
  label: "Registro Antigo",
  photos: [{ id: "p1", dataUrl: "data:1", caption: "Fachada", order: 1, size: "quarter" }],
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function NavToNewButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/novo-laudo")}>Novo Registro</button>;
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/novo-laudo/draft-1"]}>
      <NavToNewButton />
      <Routes>
        <Route path="/novo-laudo" element={<NewLaudo />} />
        <Route path="/novo-laudo/:id" element={<NewLaudo />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NewLaudo", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(imageCompression, "compressImageFile").mockResolvedValue("data:image/jpeg;base64,FAKE");
  });
  afterEach(() => vi.restoreAllMocks());

  it("resets the form when navigating from /novo-laudo/:id to /novo-laudo without a full page reload", () => {
    saveLaudo(draftWithLabel);
    renderScreen();

    expect(screen.getByLabelText(/apelido/i)).toHaveValue("Registro Antigo");

    fireEvent.click(screen.getByText("Novo Registro"));

    expect(screen.getByLabelText(/apelido/i)).toHaveValue("");
    expect(screen.queryByDisplayValue("Fachada")).not.toBeInTheDocument();
  });

  it("uploads and compresses photos, adding them numbered from 1", async () => {
    saveLaudo(draftWithLabel); // seeds the existing draft, which already has 1 photo
    renderScreen();
    fireEvent.drop(screen.getByRole("button", { name: /arraste fotos/i }), {
      dataTransfer: { files: [makeFile("a.jpg"), makeFile("b.jpg")] },
    });

    await waitFor(() => expect(screen.getAllByPlaceholderText(/legenda/i)).toHaveLength(3));
    expect(screen.getByText("3")).toBeInTheDocument(); // last photo's order badge
  });

  it("disables Gerar PDF with 0 photos and enables it once a photo is added", async () => {
    render(
      <MemoryRouter initialEntries={["/novo-laudo"]}>
        <Routes>
          <Route path="/novo-laudo" element={<NewLaudo />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /gerar pdf/i })).toBeDisabled();

    fireEvent.drop(screen.getByRole("button", { name: /arraste fotos/i }), {
      dataTransfer: { files: [makeFile("a.jpg")] },
    });

    await waitFor(() => expect(screen.getByRole("button", { name: /gerar pdf/i })).not.toBeDisabled());
  });

  it("removes a photo and renumbers the rest", async () => {
    saveLaudo({
      ...draftWithLabel,
      photos: [
        { id: "p1", dataUrl: "data:1", caption: "Um", order: 1, size: "quarter" },
        { id: "p2", dataUrl: "data:2", caption: "Dois", order: 2, size: "quarter" },
      ],
    });
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /remover foto 1/i }));

    await waitFor(() => expect(screen.queryByDisplayValue("Um")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue("Dois")).toBeInTheDocument();
  });

  it("generates the PDF and shows an error if the download itself fails", async () => {
    saveLaudo(draftWithLabel);
    vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {
      throw new Error("boom");
    });
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /gerar pdf/i }));

    await waitFor(() =>
      expect(screen.getByText(/download do pdf falhou/i)).toBeInTheDocument(),
    );
  });
});
