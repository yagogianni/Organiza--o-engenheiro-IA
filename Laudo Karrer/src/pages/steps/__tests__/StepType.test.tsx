import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { StepType } from "@/pages/steps/StepType";
import type { LaudoData } from "@/types/laudo";

const baseLaudo: LaudoData = {
  id: "1",
  type: "vistoria_cautelar",
  client: { name: "", document: "", address: "" },
  property: {
    address: "",
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
  createdAt: "",
  updatedAt: "",
};

describe("StepType", () => {
  it("renders the 3 laudo type cards", () => {
    render(<StepType laudo={baseLaudo} onSelectType={vi.fn()} />);
    expect(screen.getByText("Laudo de Vistoria Cautelar")).toBeInTheDocument();
    expect(screen.getByText("Laudo Técnico")).toBeInTheDocument();
    expect(screen.getByText("Orçamento")).toBeInTheDocument();
  });

  it("calls onSelectType with the clicked type", () => {
    const onSelectType = vi.fn();
    render(<StepType laudo={baseLaudo} onSelectType={onSelectType} />);
    fireEvent.click(screen.getByText("Orçamento"));
    expect(onSelectType).toHaveBeenCalledWith("orcamento");
  });
});
