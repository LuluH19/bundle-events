import { describe, expect, it } from "vitest";
import { AI_CRAWLERS, buildJsonLd, buildLlmsTxt, buildManifest, buildRobots, buildSitemap, serializeJsonLd } from "@/src/utils/seo";

const BASE = "https://bundleevent.me";

describe("robots", () => {
  it("ouvre le site, ferme les routes internes et pointe vers le sitemap", () => {
    const robots = buildRobots(BASE);
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    expect(rules[0]).toMatchObject({ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] });
    expect(robots.sitemap).toBe(`${BASE}/sitemap.xml`);
  });

  it("autorise explicitement les robots des IA, llms.txt compris", () => {
    const rules = buildRobots(BASE).rules;
    const ai = (Array.isArray(rules) ? rules : [rules]).find((r) => Array.isArray(r.userAgent));
    expect(ai?.userAgent).toEqual(AI_CRAWLERS);
    expect(ai?.allow).toContain("/llms.txt");
    expect(AI_CRAWLERS).toEqual(expect.arrayContaining(["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]));
  });
});

describe("sitemap", () => {
  const now = new Date("2026-11-28T00:00:00Z");

  it("liste les pages publiques, jamais un voyage partagé", () => {
    const urls = buildSitemap(BASE, now).map((e) => e.url);
    expect(urls).toEqual([`${BASE}/`, `${BASE}/evenements`, `${BASE}/actualites`]);
  });

  it("ajoute chaque article avec sa date de mise à jour", () => {
    const entries = buildSitemap(BASE, now, [
      { slug: "a", publishedAt: "2026-11-01" },
      { slug: "b", publishedAt: "2026-11-10", updatedAt: "2026-11-20" },
    ]);
    expect(entries.find((e) => e.url === `${BASE}/actualites`)?.lastModified).toEqual(new Date("2026-11-20"));
    expect(entries.find((e) => e.url === `${BASE}/actualites/b`)?.lastModified).toEqual(new Date("2026-11-20"));
    expect(entries).toHaveLength(5);
  });
});

describe("manifest", () => {
  it("nomme l'app et pointe vers des icônes qui existent", () => {
    const manifest = buildManifest();
    expect(manifest.name).toBe("Bundle Events");
    expect(manifest.lang).toBe("fr");
    expect(manifest.icons?.map((i) => i.src)).toEqual([
      "/favicon/web-app-manifest-192x192.png",
      "/favicon/web-app-manifest-512x512.png",
      "/favicon/logo-star.svg",
    ]);
  });
});

describe("JSON-LD", () => {
  it("décrit l'organisation, le site et l'application avec des URL absolues", () => {
    const graph = buildJsonLd(BASE)["@graph"];
    expect(graph.map((n) => n["@type"])).toEqual(["Organization", "WebSite", "WebApplication"]);
    expect(graph[0]).toMatchObject({ url: `${BASE}/`, sameAs: ["https://www.instagram.com/bundleevent/"] });
  });

  it("échappe < pour qu'aucune donnée ne puisse fermer la balise script", () => {
    expect(serializeJsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});

describe("llms.txt", () => {
  it("suit le format llms.txt avec des liens absolus", () => {
    const txt = buildLlmsTxt(BASE);
    expect(txt.startsWith("# Bundle Events\n\n> ")).toBe(true);
    expect(txt).toContain(`[Accueil et recherche](${BASE}/)`);
    expect(txt).toContain(`[Événements à venir](${BASE}/evenements)`);
    expect(txt).toContain(`[Actualités](${BASE}/actualites)`);
    expect(txt).toContain("## Questions fréquentes");
  });
});
