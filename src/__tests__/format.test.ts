import { describe, expect, it } from "vitest";
import { formatDuration } from "@/src/utils/format";

describe("formatDuration", () => {
  it("arrondit avant de séparer heures et minutes", () => {
    expect(formatDuration(419.7)).toBe("7h00");
    expect(formatDuration(59.6)).toBe("1h00");
  });

  it("affiche les minutes seules sous une heure", () => {
    expect(formatDuration(42)).toBe("42 min");
  });

  it("complète les minutes sur deux chiffres", () => {
    expect(formatDuration(125)).toBe("2h05");
  });
});
