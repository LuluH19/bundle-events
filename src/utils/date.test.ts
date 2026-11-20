import { describe, it, expect } from "vitest";
import {
  isDatetimeLocalAfter,
  isPastDatetimeLocal,
  toDatetimeLocalValue,
} from "@/src/utils/date";

describe("toDatetimeLocalValue", () => {
  it("formate en YYYY-MM-DDTHH:mm en heure locale", () => {
    const d = new Date(2026, 10, 6, 16, 13, 45);
    expect(toDatetimeLocalValue(d)).toBe("2026-11-06T16:13");
  });
});

describe("isPastDatetimeLocal", () => {
  const now = new Date(2026, 10, 6, 16, 13);

  it("refuse une date/heure déjà passée", () => {
    expect(isPastDatetimeLocal("2026-11-06T16:12", now)).toBe(true);
    expect(isPastDatetimeLocal("2020-01-01T10:00", now)).toBe(true);
  });

  it("accepte maintenant et le futur", () => {
    expect(isPastDatetimeLocal("2026-11-06T16:13", now)).toBe(false);
    expect(isPastDatetimeLocal("2026-11-06T16:14", now)).toBe(false);
  });
});

describe("isDatetimeLocalAfter", () => {
  it("exige un retour strictement après l'aller", () => {
    expect(isDatetimeLocalAfter("2026-12-06T18:00", "2026-12-06T18:00")).toBe(false);
    expect(isDatetimeLocalAfter("2026-12-06T17:00", "2026-12-06T18:00")).toBe(false);
    expect(isDatetimeLocalAfter("2026-12-06T19:00", "2026-12-06T18:00")).toBe(true);
  });
});
