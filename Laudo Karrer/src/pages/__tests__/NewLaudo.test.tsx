import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import NewLaudo from "@/pages/NewLaudo";
import { saveLaudo } from "@/lib/storage";
import type { LaudoData } from "@/types/laudo";

const draftWithClientName: LaudoData = {
  id: "draft-1",
  type: "vistoria_cautelar",
  client: { name: "Cliente Antigo", document: "", address: "" },
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
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function NavToNewLaudoButton() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate("/novo-laudo")}>Novo Laudo</button>
  );
}

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={["/novo-laudo/draft-1"]}>
      <NavToNewLaudoButton />
      <Routes>
        <Route path="/novo-laudo" element={<NewLaudo />} />
        <Route path="/novo-laudo/:id" element={<NewLaudo />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NewLaudo route remount", () => {
  beforeEach(() => {
    localStorage.clear();
    saveLaudo(draftWithClientName);
  });

  it("resets the form when navigating from /novo-laudo/:id to /novo-laudo without a full page reload", () => {
    renderWizard();

    // advance from StepType to StepClient, which surfaces the loaded draft's client name
    fireEvent.click(screen.getByText("Laudo de Vistoria Cautelar"));
    expect(screen.getByLabelText(/nome completo/i)).toHaveValue("Cliente Antigo");

    // simulate clicking "Novo Laudo" in the sidebar — a client-side navigation, no reload
    fireEvent.click(screen.getByText("Novo Laudo"));

    // must be back on step 0 (StepType) with no trace of the old draft's data —
    // if the route collision bug is present, the component doesn't remount and
    // step/client data from draft-1 leak into what the user believes is a new laudo
    expect(
      screen.getByText("Que tipo de documento você vai gerar?"),
    ).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Cliente Antigo")).not.toBeInTheDocument();
  });
});
