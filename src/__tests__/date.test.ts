import { describe, it, expect } from "vitest";
import { outboundSearch, returnSearch, isPastTime, formatDay } from "@/src/utils/date";

const NOW = new Date(2026, 10, 11, 14, 20);

describe("isPastTime", () => {
  it("flags an earlier hour today", () => {
    expect(isPastTime("2026-11-11", "14:00", NOW)).toBe(true);
  });
  it("accepts a later hour today", () => {
    expect(isPastTime("2026-11-11", "16:00", NOW)).toBe(false);
  });
  it("flags any hour on a past day", () => {
    expect(isPastTime("2026-11-10", "23:00", NOW)).toBe(true);
  });
});

describe("outboundSearch", () => {
  it("searches by arrival time when one is given", () => {
    expect(outboundSearch("2026-12-12", "18:00", NOW)).toEqual({ iso: "2026-12-12T18:00", represents: "arrival" });
  });
  it("starts from now when the date is today without a time", () => {
    expect(outboundSearch("2026-11-11", undefined, NOW)).toEqual({ iso: "2026-11-11T14:20", represents: "departure" });
  });
  it("never searches an arrival time that is already past", () => {
    expect(outboundSearch("2026-11-11", "14:00", NOW)).toEqual({ iso: "2026-11-11T14:20", represents: "departure" });
  });
  it("keeps the time of a legacy datetime value", () => {
    expect(outboundSearch("2026-12-12T09:30", undefined, NOW)).toEqual({ iso: "2026-12-12T09:30", represents: "departure" });
  });
  it("uses the default morning departure otherwise", () => {
    expect(outboundSearch("2026-12-12", undefined, NOW)).toEqual({ iso: "2026-12-12T08:00", represents: "departure" });
  });
  it("returns null without a date", () => {
    expect(outboundSearch("", undefined, NOW)).toBeNull();
  });
});

describe("returnSearch", () => {
  it("defaults to 10:00", () => {
    expect(returnSearch("2026-12-13", undefined, NOW)).toEqual({ iso: "2026-12-13T10:00", represents: "departure" });
  });
  it("uses the chosen hour", () => {
    expect(returnSearch("2026-12-13", "15:00", NOW)?.iso).toBe("2026-12-13T15:00");
  });
  it("never leaves before the outbound arrival on a day trip", () => {
    expect(returnSearch("2026-12-12", "10:00", NOW, "18:00")?.iso).toBe("2026-12-12T18:00");
  });
  it("moves a past hour today to now", () => {
    expect(returnSearch("2026-11-11", "10:00", NOW)?.iso).toBe("2026-11-11T14:20");
  });
});

describe("formatDay", () => {
  it("formats a French short day", () => {
    expect(formatDay("2026-12-12")).toBe("sam. 12 déc.");
  });
});
