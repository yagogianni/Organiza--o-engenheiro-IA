import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { StepProperty } from "@/pages/steps/StepProperty";
import type { PropertyData } from "@/types/laudo";

const emptyProperty: PropertyData = {
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  inspectionDate: "",
  artNumber: "",
  description: "",
};

describe("StepProperty", () => {
  it("updates the address field via onChange", () => {
    const onChange = vi.fn();
    render(<StepProperty property={emptyProperty} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^endereço$/i), { target: { value: "Rua X, 100" } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyProperty, address: "Rua X, 100" });
  });

  it("selects a UF from the Estado dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StepProperty property={emptyProperty} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Santa Catarina" }));

    expect(onChange).toHaveBeenCalledWith({ ...emptyProperty, state: "SC" });
  });

  it("blocks advancing and shows an error when ART number is empty", () => {
    const onNext = vi.fn();
    render(<StepProperty property={emptyProperty} onChange={vi.fn()} onNext={onNext} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText(/obrigatório/i)).toBeInTheDocument();
  });

  it("advances when ART number is filled", () => {
    const onNext = vi.fn();
    render(
      <StepProperty
        property={{ ...emptyProperty, artNumber: "ART-123" }}
        onChange={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).toHaveBeenCalled();
  });
});
