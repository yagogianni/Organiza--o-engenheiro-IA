import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import { AuthGuard } from "@/components/auth/AuthGuard";
import * as auth from "@/lib/auth";

function renderWithGuard(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/" element={<div>Protected Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthGuard", () => {
  it("renders the protected route when authenticated", () => {
    vi.spyOn(auth, "isAuthenticated").mockReturnValue(true);
    renderWithGuard("/");
    expect(screen.getByText("Protected Home")).toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    vi.spyOn(auth, "isAuthenticated").mockReturnValue(false);
    renderWithGuard("/");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});
