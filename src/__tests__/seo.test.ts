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
  it("ne liste que l'accueil, jamais un voyage partagé", () => {
    const now = new Date("2026-11-27T00:00:00Z");
    expect(buildSitemap(BASE, now)).toEqual([{ url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 }]);
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
    expect(txt).toContain("## Questions fréquentes");
  });
});
