import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenDataEventAdapter } from "@/src/adapters/events/opendata.adapter";
import { EVENT_CATEGORIES } from "@/src/utils/constants/event-categories";

afterEach(() => vi.unstubAllGlobals());

const capture = () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
  vi.stubGlobal("fetch", fetchMock);
  return () => new URL(String(fetchMock.mock.calls[0][0]));
};

describe("EVENT_CATEGORIES", () => {
  it("a des identifiants uniques et au moins un mot-clé chacun", () => {
    expect(new Set(EVENT_CATEGORIES.map((c) => c.id)).size).toBe(EVENT_CATEGORIES.length);
    EVENT_CATEGORIES.forEach((c) => expect(c.keywords.length).toBeGreaterThan(0));
  });
});

describe("OpenData : idées par catégorie", () => {
  it("cherche les mots-clés de la catégorie dans la ville", async () => {
    const url = capture();
    await new OpenDataEventAdapter().searchEvents({ query: "Lyon", city: "Lyon", keywords: ["débat", "conférence"] });
    const where = url().searchParams.get("where") ?? "";
    expect(where).toContain('search(title_fr, "débat")');
    expect(where).toContain('search(keywords_fr, "conférence")');
    expect(where).not.toContain('"concert"');
  });

  it("garde les mots-clés par défaut sans catégorie", async () => {
    const url = capture();
    await new OpenDataEventAdapter().searchEvents({ query: "Lyon", city: "Lyon" });
    expect(url().searchParams.get("where")).toContain('"concert"');
  });
});
