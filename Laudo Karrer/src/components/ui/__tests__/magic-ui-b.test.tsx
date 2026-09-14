import { render, screen, fireEvent } from "@testing-library/react";
import { GradientText } from "@/components/ui/gradient-text";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { AnimatedCard } from "@/components/ui/animated-card";

describe("GradientText", () => {
  it("renders its children with a gradient background-image", () => {
    render(<GradientText from="#1B3A6B" to="#2E5FA3">Karrer</GradientText>);
    const el = screen.getByText("Karrer");
    // Browser converts hex to RGB via CSSOM: #1B3A6B = rgb(27, 58, 107), #2E5FA3 = rgb(46, 95, 163)
    expect(el.style.backgroundImage).toContain("rgb(27, 58, 107)"); // from
    expect(el.style.backgroundImage).toContain("rgb(46, 95, 163)"); // to
  });
});

describe("SpotlightCard", () => {
  it("renders children and calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<SpotlightCard onClick={onClick}>Laudo de Vistoria Cautelar</SpotlightCard>);
    fireEvent.click(screen.getByText("Laudo de Vistoria Cautelar"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("updates the --x/--y CSS variables on mouse move", () => {
    render(<SpotlightCard>Conteúdo</SpotlightCard>);
    const card = screen.getByText("Conteúdo").closest("div")!.parentElement as HTMLElement;
    fireEvent.mouseMove(card, { clientX: 50, clientY: 30 });
    expect(card.style.getPropertyValue("--x")).toBe("50px");
    expect(card.style.getPropertyValue("--y")).toBe("30px");
  });
});

describe("AnimatedCard", () => {
  it("renders its children", () => {
    render(<AnimatedCard>Total: 12</AnimatedCard>);
    expect(screen.getByText("Total: 12")).toBeInTheDocument();
  });
});
