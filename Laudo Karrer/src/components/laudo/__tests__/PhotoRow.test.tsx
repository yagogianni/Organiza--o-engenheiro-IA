import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { PhotoRow } from "@/components/laudo/PhotoRow";
import type { PhotoItem } from "@/types/laudo";

function makePhoto(overrides: Partial<PhotoItem> = {}): PhotoItem {
  return { id: "p1", dataUrl: "data:image/jpeg;base64,FAKE", caption: "", order: 1, size: "quarter", ...overrides };
}

function renderRow(overrides: Partial<PhotoItem> = {}, propOverrides: Partial<React.ComponentProps<typeof PhotoRow>> = {}) {
  return render(
    <PhotoRow
      photo={makePhoto(overrides)}
      isFirst={false}
      isLast={false}
      onCaptionChange={vi.fn()}
      onSizeChange={vi.fn()}
      onMoveUp={vi.fn()}
      onMoveDown={vi.fn()}
      onRemove={vi.fn()}
      {...propOverrides}
    />,
  );
}

describe("PhotoRow", () => {
  it("shows the photo's order badge and caption", () => {
    renderRow({ caption: "Fachada" });
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Fachada")).toBeInTheDocument();
  });

  it("calls onCaptionChange when the caption is edited", () => {
    const onCaptionChange = vi.fn();
    renderRow({}, { onCaptionChange });
    fireEvent.change(screen.getByPlaceholderText(/legenda/i), { target: { value: "Fundos" } });
    expect(onCaptionChange).toHaveBeenCalledWith("Fundos");
  });

  it("calls onSizeChange when a different size is selected", async () => {
    const user = userEvent.setup();
    const onSizeChange = vi.fn();
    renderRow({}, { onSizeChange });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Página inteira" }));

    expect(onSizeChange).toHaveBeenCalledWith("full");
  });

  it("disables move up on the first item and move down on the last item", () => {
    renderRow({}, { isFirst: true, isLast: true });
    expect(screen.getByRole("button", { name: /mover foto 1 para cima/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /mover foto 1 para baixo/i })).toBeDisabled();
  });

  it("calls onMoveUp, onMoveDown, and onRemove", () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onRemove = vi.fn();
    renderRow({}, { onMoveUp, onMoveDown, onRemove });

    fireEvent.click(screen.getByRole("button", { name: /mover foto 1 para cima/i }));
    fireEvent.click(screen.getByRole("button", { name: /mover foto 1 para baixo/i }));
    fireEvent.click(screen.getByRole("button", { name: /remover foto 1/i }));

    expect(onMoveUp).toHaveBeenCalled();
    expect(onMoveDown).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalled();
  });
});
