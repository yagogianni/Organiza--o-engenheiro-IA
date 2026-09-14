import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { MobileHeader } from "@/components/layout/MobileHeader";

function Wrapper() {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <MobileHeader drawerOpen={open} onToggleDrawer={() => setOpen((v) => !v)} />
    </MemoryRouter>
  );
}

describe("MobileHeader", () => {
  it("opens the drawer nav on hamburger click and closes it again", () => {
    render(<Wrapper />);
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /fechar menu/i }));
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
  });
});
