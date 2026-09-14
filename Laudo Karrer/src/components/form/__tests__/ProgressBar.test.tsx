import { render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/form/ProgressBar";

describe("ProgressBar", () => {
  it("renders all 6 step labels", () => {
    render(<ProgressBar currentStep={0} />);
    ["Tipo", "Cliente", "Imóvel", "Fotos", "Conclusão", "Revisão"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("shows a check icon for steps before the current one", () => {
    render(<ProgressBar currentStep={2} />);
    // steps 0 and 1 are completed -> render an svg check instead of their number
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    // step 2 (index 2, "current") shows its 1-based number "3"
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
