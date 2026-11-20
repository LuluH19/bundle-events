import { describe, expect, it } from "vitest";
import { firstNonEmpty, firstNonEmptyParallel, firstSuccess, withBudget } from "@/src/utils/fallback";

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

describe("firstNonEmptyParallel", () => {
  it("lance toutes les sources en même temps et garde la première non vide dans l'ordre", async () => {
    const started: string[] = [];
    const step = (name: string, ms: number, value: number[]) => ({
      name,
      run: () => {
        started.push(name);
        return new Promise<number[]>((r) => setTimeout(() => r(value), ms));
      },
    });
    const t0 = Date.now();
    const res = await firstNonEmptyParallel([step("a", 30, []), step("b", 30, [2]), step("c", 5, [3])]);
    expect(res).toEqual({ source: "b", value: [2] });
    expect(started).toEqual(["a", "b", "c"]);
    expect(Date.now() - t0).toBeLessThan(55);
  });

  it("ignore une source en erreur", async () => {
    const res = await firstNonEmptyParallel([
      { name: "ko", run: () => Promise.reject(new Error("401")) },
      { name: "ok", run: async () => [1] },
    ]);
    expect(res.source).toBe("ok");
  });
});

describe("withBudget", () => {
  it("rend la valeur de repli si la source dépasse le budget", async () => {
    const slow = new Promise<string>((r) => setTimeout(() => r("tard"), 50));
    await expect(withBudget(slow, 10, "repli")).resolves.toBe("repli");
  });

  it("rend la vraie valeur si elle arrive à temps, et le repli en cas d'erreur", async () => {
    await expect(withBudget(Promise.resolve("ok"), 50, "repli")).resolves.toBe("ok");
    await expect(withBudget(Promise.reject(new Error("x")), 50, "repli")).resolves.toBe("repli");
  });
});
