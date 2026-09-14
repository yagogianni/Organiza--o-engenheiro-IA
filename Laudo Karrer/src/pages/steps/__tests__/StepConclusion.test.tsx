import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { StepConclusion } from "@/pages/steps/StepConclusion";

describe("StepConclusion", () => {
  it("updates the conclusion field via onChangeConclusion", () => {
    const onChangeConclusion = vi.fn();
    render(
      <StepConclusion
        conclusion=""
        notes=""
        onChangeConclusion={onChangeConclusion}
        onChangeNotes={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^conclusão$/i), { target: { value: "Tudo conforme." } });
    expect(onChangeConclusion).toHaveBeenCalledWith("Tudo conforme.");
  });

  it("updates the notes field via onChangeNotes", () => {
    const onChangeNotes = vi.fn();
    render(
      <StepConclusion
        conclusion="x"
        notes=""
        onChangeConclusion={vi.fn()}
        onChangeNotes={onChangeNotes}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    // exact match — a regex would also match the tooltip trigger's aria-label
    fireEvent.change(screen.getByLabelText("Notas Técnicas"), { target: { value: "Medição com trena." } });
    expect(onChangeNotes).toHaveBeenCalledWith("Medição com trena.");
  });

  it("renders a tooltip trigger explaining Notas Técnicas", () => {
    render(
      <StepConclusion
        conclusion=""
        notes=""
        onChangeConclusion={vi.fn()}
        onChangeNotes={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/o que são notas técnicas/i)).toBeInTheDocument();
  });

  it("blocks advancing and shows an error when conclusion is empty", () => {
    const onNext = vi.fn();
    render(
      <StepConclusion
        conclusion=""
        notes=""
        onChangeConclusion={vi.fn()}
        onChangeNotes={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText(/obrigatório/i)).toBeInTheDocument();
  });

  it("advances when conclusion is filled", () => {
    const onNext = vi.fn();
    render(
      <StepConclusion
        conclusion="Tudo certo."
        notes=""
        onChangeConclusion={vi.fn()}
        onChangeNotes={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).toHaveBeenCalled();
  });
});
