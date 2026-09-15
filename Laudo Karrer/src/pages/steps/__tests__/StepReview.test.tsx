import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { StepReview } from "@/pages/steps/StepReview";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { LaudoData } from "@/types/laudo";

const laudo: LaudoData = {
  id: "1",
  type: "laudo_tecnico",
  client: { name: "Maria Souza", document: "123.456.789-00", address: "Rua A, 1" },
  property: {
    address: "Rua B, 2",
    neighborhood: "Centro",
    city: "BC",
    state: "SC",
    inspectionDate: "2026-09-14",
    artNumber: "ART-001",
    description: "",
  },
  photos: [{ id: "p1", dataUrl: "data:1", caption: "", order: 1 }],
  conclusion: "Tudo certo.",
  status: "draft",
  createdAt: "",
  updatedAt: "",
};

describe("StepReview", () => {
  it("renders a summary of each section", () => {
    render(
      <StepReview laudo={laudo} saveError={null} onBack={vi.fn()} onSaveDraft={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.getByText("Laudo Técnico")).toBeInTheDocument();
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getByText("1 foto(s) anexada(s)")).toBeInTheDocument();
    expect(screen.getByText("Tudo certo.")).toBeInTheDocument();
  });

  it("calls onSaveDraft when clicking Salvar rascunho", () => {
    const onSaveDraft = vi.fn();
    render(
      <StepReview laudo={laudo} saveError={null} onBack={vi.fn()} onSaveDraft={onSaveDraft} onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /salvar rascunho/i }));
    expect(onSaveDraft).toHaveBeenCalled();
  });

  it("completes and downloads the PDF when clicking Gerar PDF and completion succeeds", () => {
    const onComplete = vi.fn().mockReturnValue(true);
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(
      <StepReview laudo={laudo} saveError={null} onBack={vi.fn()} onSaveDraft={vi.fn()} onComplete={onComplete} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /gerar pdf/i }));

    expect(onComplete).toHaveBeenCalled();
    expect(downloadSpy).toHaveBeenCalledWith(laudo);
  });

  it("does not download when completion fails (e.g. storage quota)", () => {
    const onComplete = vi.fn().mockReturnValue(false);
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(
      <StepReview
        laudo={laudo}
        saveError="Espaço cheio."
        onBack={vi.fn()}
        onSaveDraft={vi.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /gerar pdf/i }));

    expect(downloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Espaço cheio.")).toBeInTheDocument();
  });

  it("calls onBack when clicking Voltar", () => {
    const onBack = vi.fn();
    render(
      <StepReview laudo={laudo} saveError={null} onBack={onBack} onSaveDraft={vi.fn()} onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
