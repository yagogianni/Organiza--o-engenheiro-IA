import { render, screen } from "@testing-library/react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { SparklesText } from "@/components/ui/sparkles-text";

describe("ShimmerButton", () => {
  it("renders its children as a button and forwards onClick", async () => {
    const onClick = vi.fn();
    render(<ShimmerButton onClick={onClick}>Gerar PDF</ShimmerButton>);
    const button = screen.getByRole("button", { name: "Gerar PDF" });
    button.click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("BorderBeam", () => {
  it("renders with the given duration as a CSS custom property", () => {
    render(<BorderBeam duration={4} />);
    const beam = screen.getByTestId("border-beam");
    expect(beam.style.getPropertyValue("--duration")).toBe("4s");
  });
});

describe("SparklesText", () => {
  it("renders the wrapped text", () => {
    render(<SparklesText>Crie seu primeiro laudo</SparklesText>);
    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });

  it("renders the requested number of sparkles", () => {
    const { container } = render(<SparklesText sparkleCount={5}>Texto</SparklesText>);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(5);
  });
});
