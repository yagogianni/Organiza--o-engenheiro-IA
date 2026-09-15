import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import LoginPage from "@/components/auth/LoginPage";
import * as auth from "@/lib/auth";

describe("LoginPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows validation shake and error message on failed login when the app is configured", async () => {
    vi.spyOn(auth, "login").mockReturnValue(false);
    vi.spyOn(auth, "isAppConfigured").mockReturnValue(true);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText("Usuário"), "bernardo");
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/usuário ou senha inválidos/i)).toBeInTheDocument();
    });
  });

  it("shows a distinct 'not configured' message when the app has no username/password hash set", async () => {
    vi.spyOn(auth, "login").mockReturnValue(false);
    vi.spyOn(auth, "isAppConfigured").mockReturnValue(false);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText("Usuário"), "bernardo");
    await userEvent.type(screen.getByLabelText("Senha"), "qualquer");
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/aplicativo não configurado/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/usuário ou senha inválidos/i)).not.toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const passwordInput = screen.getByLabelText("Senha") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    await userEvent.click(screen.getByRole("button", { name: /mostrar senha/i }));
    expect(passwordInput.type).toBe("text");
  });

  it("calls login with entered credentials on submit", async () => {
    const loginSpy = vi.spyOn(auth, "login").mockReturnValue(true);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText("Usuário"), "bernardo");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-correta");
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(loginSpy).toHaveBeenCalledWith("bernardo", "senha-correta");
  });
});
