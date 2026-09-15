import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { useLaudoForm, STEP_COUNT } from "@/hooks/useLaudoForm";
import * as storage from "@/lib/storage";

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("useLaudoForm", () => {
  beforeEach(() => localStorage.clear());

  it("starts at step 0 with an empty draft", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    expect(result.current.step).toBe(0);
    expect(result.current.laudo.status).toBe("draft");
  });

  it("next/back stay within [0, STEP_COUNT - 1]", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.back());
    expect(result.current.step).toBe(0);

    act(() => {
      for (let i = 0; i < STEP_COUNT + 2; i++) result.current.next();
    });
    expect(result.current.step).toBe(STEP_COUNT - 1);
  });

  it("updateType updates the draft's type", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.updateType("orcamento"));
    expect(result.current.laudo.type).toBe("orcamento");
  });

  it("saveDraft persists the laudo with status draft", () => {
    const saveSpy = vi.spyOn(storage, "saveLaudo");
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.saveDraft());
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
  });

  it("complete persists the laudo with status completed and returns true", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    let success: boolean | undefined;
    act(() => {
      success = result.current.complete();
    });
    expect(success).toBe(true);
    expect(storage.getLaudos()[0].status).toBe("completed");
  });

  it("seeds the initial laudo from getLaudo(id) when an id is provided", () => {
    const draft = {
      id: "draft-1",
      type: "orcamento" as const,
      client: { name: "Cliente Existente", document: "", address: "" },
      property: {
        address: "Rua Antiga, 5",
        neighborhood: "",
        city: "",
        state: "",
        inspectionDate: "",
        artNumber: "",
        description: "",
      },
      photos: [],
      conclusion: "",
      status: "draft" as const,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    };
    storage.saveLaudo(draft);

    const { result } = renderHook(() => useLaudoForm("draft-1"), { wrapper });

    expect(result.current.laudo.id).toBe("draft-1");
    expect(result.current.laudo.client.name).toBe("Cliente Existente");
    expect(result.current.laudo.property.address).toBe("Rua Antiga, 5");
  });

  it("falls back to an empty draft when the id doesn't match a saved laudo", () => {
    const { result } = renderHook(() => useLaudoForm("does-not-exist"), { wrapper });

    expect(result.current.laudo.id).not.toBe("does-not-exist");
    expect(result.current.laudo.status).toBe("draft");
    expect(result.current.laudo.client.name).toBe("");
  });
});
