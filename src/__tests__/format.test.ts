import { describe, expect, it } from "vitest";
import { capitalizeFirst, formatDuration } from "@/src/utils/format";

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

describe("capitalizeFirst", () => {
  it("met une majuscule à la première lettre du titre", () => {
    expect(capitalizeFirst("concert : Oizeau")).toBe("Concert : Oizeau");
    expect(capitalizeFirst("  spectacle de marionnettes")).toBe("Spectacle de marionnettes");
    expect(capitalizeFirst("« le grand bal »")).toBe("« Le grand bal »");
    expect(capitalizeFirst("élection de miss")).toBe("Élection de miss");
  });

  it("ne touche ni au reste du texte ni à un titre qui commence par un chiffre", () => {
    expect(capitalizeFirst("SEQUENZA 9.3")).toBe("SEQUENZA 9.3");
    expect(capitalizeFirst("3 jours de fête")).toBe("3 jours de fête");
    expect(capitalizeFirst("")).toBe("");
  });
});
