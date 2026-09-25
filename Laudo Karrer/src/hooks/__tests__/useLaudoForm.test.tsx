import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { useLaudoForm } from "@/hooks/useLaudoForm";
import * as storage from "@/lib/storage";

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

function photo(id: string) {
  return { id, dataUrl: `data:${id}`, caption: "", order: 0, size: "quarter" as const };
}

describe("useLaudoForm", () => {
  beforeEach(() => localStorage.clear());

  it("starts with an empty draft", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    expect(result.current.report.status).toBe("draft");
    expect(result.current.report.photos).toEqual([]);
  });

  it("updateLabel updates the draft's label", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.updateLabel("Vistoria Rua X"));
    expect(result.current.report.label).toBe("Vistoria Rua X");
  });

  it("addPhotos appends and numbers photos from 1", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a"), photo("b")]));
    expect(result.current.report.photos.map((p) => p.order)).toEqual([1, 2]);
  });

  it("addPhotos merges onto the latest state, not a stale snapshot", () => {
    // Regression guard: addPhotos uses React's functional setState updater
    // internally, so a caller awaiting something async (image compression)
    // before calling it can never clobber state changed in the meantime.
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a")]));
    act(() => result.current.updateLabel("Set during the gap"));
    act(() => result.current.addPhotos([photo("b")]));

    expect(result.current.report.label).toBe("Set during the gap");
    expect(result.current.report.photos.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("updateCaption updates only the targeted photo", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a"), photo("b")]));
    act(() => result.current.updateCaption("a", "Fachada"));
    expect(result.current.report.photos.find((p) => p.id === "a")?.caption).toBe("Fachada");
    expect(result.current.report.photos.find((p) => p.id === "b")?.caption).toBe("");
  });

  it("updateSize updates only the targeted photo", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a")]));
    act(() => result.current.updateSize("a", "full"));
    expect(result.current.report.photos[0].size).toBe("full");
  });

  it("removePhoto removes and renumbers the rest", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a"), photo("b")]));
    act(() => result.current.removePhoto("a"));
    expect(result.current.report.photos).toEqual([{ ...photo("b"), order: 1 }]);
  });

  it("removeAllPhotos clears the list", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a")]));
    act(() => result.current.removeAllPhotos());
    expect(result.current.report.photos).toEqual([]);
  });

  it("movePhoto swaps with the neighbor, renumbers, and clamps at the ends", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.addPhotos([photo("a"), photo("b")]));

    act(() => result.current.movePhoto("b", "up"));
    expect(result.current.report.photos.map((p) => p.id)).toEqual(["b", "a"]);

    act(() => result.current.movePhoto("b", "up")); // already first, no-op
    expect(result.current.report.photos.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("saveDraft persists the report with status draft", () => {
    const saveSpy = vi.spyOn(storage, "saveLaudo");
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.saveDraft());
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
  });

  it("complete persists the report with status completed and returns true", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    let success: boolean | undefined;
    act(() => {
      success = result.current.complete();
    });
    expect(success).toBe(true);
    expect(storage.getLaudos()[0].status).toBe("completed");
  });

  it("seeds the initial report from getLaudo(id) when an id is provided", () => {
    storage.saveLaudo({
      id: "draft-1",
      label: "Antigo",
      photos: [],
      status: "draft",
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    });

    const { result } = renderHook(() => useLaudoForm("draft-1"), { wrapper });
    expect(result.current.report.id).toBe("draft-1");
    expect(result.current.report.label).toBe("Antigo");
  });

  it("falls back to an empty draft when the id doesn't match a saved report", () => {
    const { result } = renderHook(() => useLaudoForm("does-not-exist"), { wrapper });
    expect(result.current.report.id).not.toBe("does-not-exist");
    expect(result.current.report.status).toBe("draft");
  });
});
