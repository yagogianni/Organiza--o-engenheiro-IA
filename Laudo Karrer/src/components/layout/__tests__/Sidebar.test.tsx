import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { Sidebar } from "@/components/layout/Sidebar";
import * as auth from "@/lib/auth";

describe("Sidebar", () => {
  it("renders the 3 nav items and Logout", () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /novo laudo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /meus laudos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("opens a confirmation dialog before logging out, and logs out on confirm", () => {
    const logoutSpy = vi.spyOn(auth, "logout").mockImplementation(() => {});
    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(screen.getByText(/sair do sistema/i)).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(logoutSpy).toHaveBeenCalled();
  });
});
