import { describe, expect, it } from "vitest";
import { firstNonEmpty, firstSuccess } from "@/src/utils/fallback";

describe("firstNonEmpty", () => {
  it("garde le premier fournisseur qui renvoie des résultats", async () => {
    const result = await firstNonEmpty([
      { name: "a", run: async () => [] },
      { name: "b", run: async () => [1, 2] },
      { name: "c", run: async () => [3] },
    ]);
    expect(result).toEqual({ source: "b", value: [1, 2] });
  });

  it("passe au suivant quand un fournisseur échoue", async () => {
    const result = await firstNonEmpty([
      { name: "a", run: async () => Promise.reject(new Error("quota")) },
      { name: "b", run: async () => ["ok"] },
    ]);
    expect(result.source).toBe("b");
  });

  it("renvoie une liste vide quand tout est vide ou en erreur", async () => {
    const result = await firstNonEmpty<number>([
      { name: "a", run: async () => [] },
      { name: "b", run: async () => Promise.reject(new Error("down")) },
    ]);
    expect(result).toEqual({ source: null, value: [] });
  });
});

describe("firstSuccess", () => {
  it("renvoie le premier succès", async () => {
    const result = await firstSuccess([
      { name: "mapbox", run: async () => Promise.reject(new Error("401")) },
      { name: "osrm", run: async () => "route" },
    ]);
    expect(result).toEqual({ source: "osrm", value: "route" });
  });

  it("relance la dernière erreur quand tout échoue", async () => {
    await expect(
      firstSuccess([
        { name: "a", run: async () => Promise.reject(new Error("a")) },
        { name: "b", run: async () => Promise.reject(new Error("b")) },
      ])
    ).rejects.toThrow("b");
  });
});
