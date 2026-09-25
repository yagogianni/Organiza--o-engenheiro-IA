import { beforeEach, vi } from "vitest";
import { getLaudos, getLaudo, saveLaudo, deleteLaudo, StorageQuotaError } from "@/lib/storage";
import type { PhotoReport } from "@/types/laudo";

function makeReport(overrides: Partial<PhotoReport> = {}): PhotoReport {
  return {
    id: "report-1",
    label: "Vistoria Rua X",
    photos: [],
    status: "draft",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getLaudos returns an empty array when nothing is stored", () => {
    expect(getLaudos()).toEqual([]);
  });

  it("saveLaudo adds a new report and getLaudo finds it by id", () => {
    saveLaudo(makeReport());
    expect(getLaudo("report-1")?.label).toBe("Vistoria Rua X");
  });

  it("saveLaudo updates an existing report in place and bumps updatedAt", () => {
    saveLaudo(makeReport({ updatedAt: "2026-09-25T10:00:00.000Z" }));
    saveLaudo(makeReport({ label: "Vistoria revisada" }));

    const reports = getLaudos();
    expect(reports).toHaveLength(1);
    expect(reports[0].label).toBe("Vistoria revisada");
    expect(reports[0].updatedAt).not.toBe("2026-09-25T10:00:00.000Z");
  });

  it("getLaudo returns undefined for an unknown id", () => {
    expect(getLaudo("does-not-exist")).toBeUndefined();
  });

  it("deleteLaudo removes only the targeted report", () => {
    saveLaudo(makeReport({ id: "report-1" }));
    saveLaudo(makeReport({ id: "report-2" }));
    deleteLaudo("report-1");

    const reports = getLaudos();
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe("report-2");
  });

  it("saveLaudo throws StorageQuotaError when localStorage is full", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(() => saveLaudo(makeReport())).toThrow(StorageQuotaError);

    setItemSpy.mockRestore();
  });

  it("does not crash reading a pre-existing entry saved in the old LaudoData shape", () => {
    // Accepted breaking change (see spec): no migration. A user who already
    // has laudos saved from before this feature must not see the app crash —
    // the old-shaped object round-trips through JSON untouched; callers that
    // read the new fields (label, photo.size) just see `undefined`.
    const legacyShaped = {
      id: "old-1",
      type: "vistoria_cautelar",
      client: { name: "Cliente Antigo", document: "", address: "" },
      property: { address: "Rua Antiga", neighborhood: "", city: "", state: "", inspectionDate: "", artNumber: "", description: "" },
      photos: [{ id: "p1", dataUrl: "data:1", caption: "Velha", order: 1 }],
      conclusion: "",
      status: "draft",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    localStorage.setItem("karrer_laudos", JSON.stringify([legacyShaped]));

    expect(() => getLaudos()).not.toThrow();
    const [loaded] = getLaudos();
    expect(loaded.id).toBe("old-1");
    expect(loaded.label).toBeUndefined();
  });
});
