import { beforeEach, vi } from "vitest";
import { getLaudos, getLaudo, saveLaudo, deleteLaudo, StorageQuotaError } from "@/lib/storage";
import type { LaudoData } from "@/types/laudo";

function makeLaudo(overrides: Partial<LaudoData> = {}): LaudoData {
  return {
    id: "laudo-1",
    type: "vistoria_cautelar",
    client: { name: "Cliente Teste", document: "123.456.789-00", address: "Rua A, 1" },
    property: {
      address: "Rua B, 2",
      neighborhood: "Centro",
      city: "Balneário Camboriú",
      state: "SC",
      inspectionDate: "2026-09-14",
      artNumber: "ART-001",
      description: "Casa térrea",
    },
    photos: [],
    conclusion: "Conclusão de teste",
    status: "draft",
    createdAt: "2026-09-14T10:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z",
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

  it("saveLaudo adds a new laudo and getLaudo finds it by id", () => {
    saveLaudo(makeLaudo());
    expect(getLaudo("laudo-1")?.client.name).toBe("Cliente Teste");
  });

  it("saveLaudo updates an existing laudo in place and bumps updatedAt", () => {
    saveLaudo(makeLaudo({ updatedAt: "2026-09-14T10:00:00.000Z" }));
    saveLaudo(makeLaudo({ conclusion: "Conclusão revisada" }));

    const laudos = getLaudos();
    expect(laudos).toHaveLength(1);
    expect(laudos[0].conclusion).toBe("Conclusão revisada");
    expect(laudos[0].updatedAt).not.toBe("2026-09-14T10:00:00.000Z");
  });

  it("getLaudo returns undefined for an unknown id", () => {
    expect(getLaudo("does-not-exist")).toBeUndefined();
  });

  it("deleteLaudo removes only the targeted laudo", () => {
    saveLaudo(makeLaudo({ id: "laudo-1" }));
    saveLaudo(makeLaudo({ id: "laudo-2" }));
    deleteLaudo("laudo-1");

    const laudos = getLaudos();
    expect(laudos).toHaveLength(1);
    expect(laudos[0].id).toBe("laudo-2");
  });

  it("saveLaudo throws StorageQuotaError when localStorage is full", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new DOMException("quota exceeded", "QuotaExceededError");
      throw err;
    });

    expect(() => saveLaudo(makeLaudo())).toThrow(StorageQuotaError);

    setItemSpy.mockRestore();
  });
});
