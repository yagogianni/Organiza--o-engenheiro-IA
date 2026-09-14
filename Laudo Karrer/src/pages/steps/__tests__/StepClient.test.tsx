import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { StepClient } from "@/pages/steps/StepClient";
import type { ClientData } from "@/types/laudo";

const emptyClient: ClientData = { name: "", document: "", address: "", email: "" };

describe("StepClient", () => {
  it("updates the name field via onChange", () => {
    const onChange = vi.fn();
    render(<StepClient client={emptyClient} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: "João Silva" } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyClient, name: "João Silva" });
  });

  it("masks the CPF/CNPJ field as the user types", () => {
    const onChange = vi.fn();
    render(<StepClient client={emptyClient} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/cpf\/cnpj/i), { target: { value: "12345678900" } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyClient, document: "123.456.789-00" });
  });

  it("blocks advancing and shows an error when name is empty", () => {
    const onNext = vi.fn();
    render(<StepClient client={emptyClient} onChange={vi.fn()} onNext={onNext} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText(/obrigatório/i)).toBeInTheDocument();
  });

  it("advances when name is filled", () => {
    const onNext = vi.fn();
    render(
      <StepClient
        client={{ ...emptyClient, name: "João Silva" }}
        onChange={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it("calls onBack when clicking Voltar", () => {
    const onBack = vi.fn();
    render(<StepClient client={emptyClient} onChange={vi.fn()} onNext={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
