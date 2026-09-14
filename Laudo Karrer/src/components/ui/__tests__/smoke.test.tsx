import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

describe("shadcn primitives", () => {
  it("renders a Button with its label", () => {
    render(<Button>Gerar PDF</Button>);
    expect(screen.getByRole("button", { name: "Gerar PDF" })).toBeInTheDocument();
  });

  it("renders a Badge with its label", () => {
    render(<Badge>Concluído</Badge>);
    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });
});
