import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAllNews, NEWS_DIR, loadNewsFrom } from "@/src/services/news";
import {
  buildNewsArticleJsonLd,
  NEWS_DESCRIPTION_MAX,
  NEWS_DESCRIPTION_MIN,
  NEWS_TITLE_MAX,
  parseNewsArticle,
  readingMinutes,
  sortNews,
} from "@/src/utils/news";
import { parseVenueLink, venueLink } from "@/src/utils/venue-link";
import type { NewsArticle, Venue } from "@/src/types";

const valid = {
  slug: "un-article",
  title: "Un titre court",
  description: "x".repeat(130),
  publishedAt: "2026-11-28",
  author: "Équipe Bundle Events",
  tags: ["concert"],
  lead: "Un chapeau.",
  blocks: [
    { type: "h2", text: "Intertitre" },
    { type: "p", text: "Texte." },
    { type: "ul", items: ["Un", "Deux"] },
  ],
  sources: [
    { title: "A", publisher: "P", url: "https://a.fr" },
    { title: "B", publisher: "Q", url: "https://b.fr" },
  ],
};

describe("parseNewsArticle", () => {
  it("accepte un article complet", () => {
    expect(parseNewsArticle(valid).slug).toBe("un-article");
  });

  it.each([
    ["slug avec majuscules", { slug: "Un-Article" }],
    ["titre trop long", { title: "t".repeat(NEWS_TITLE_MAX + 1) }],
    ["description trop courte", { description: "x".repeat(NEWS_DESCRIPTION_MIN - 1) }],
    ["description trop longue", { description: "x".repeat(NEWS_DESCRIPTION_MAX + 1) }],
    ["date mal formée", { publishedAt: "28/11/2026" }],
    ["une seule source", { sources: [valid.sources[0]] }],
    ["source en http", { sources: [valid.sources[0], { title: "B", publisher: "Q", url: "http://b.fr" }] }],
    ["sans intertitre", { blocks: [{ type: "p", text: "Texte." }] }],
    ["bloc inconnu", { blocks: [{ type: "h2", text: "T" }, { type: "html", text: "<b>x</b>" }] }],
  ])("rejette : %s", (_label, patch) => {
    expect(() => parseNewsArticle({ ...valid, ...patch })).toThrow();
  });
});

describe("articles publiés", () => {
  it("chaque fichier de src/content/news est valide et porte le nom de son slug", () => {
    const articles = loadNewsFrom(NEWS_DIR);
    expect(articles.length).toBeGreaterThan(0);
    expect(new Set(articles.map((a) => a.slug)).size).toBe(articles.length);
  });

  it("sont triés du plus récent au plus ancien", () => {
    const dates = getAllNews().map((a) => a.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("outils d'article", () => {
  const article = parseNewsArticle(valid) as NewsArticle;

  it("trie par date puis par slug", () => {
    const older = { ...article, slug: "b", publishedAt: "2026-01-01" };
    const newer = { ...article, slug: "a", publishedAt: "2026-12-01" };
    expect(sortNews([older, newer]).map((a) => a.slug)).toEqual(["a", "b"]);
  });

  it("donne au moins une minute de lecture", () => {
    expect(readingMinutes(article)).toBe(1);
  });

  it("décrit l'article en NewsArticle avec fil d'Ariane", () => {
    const graph = buildNewsArticleJsonLd(article, "https://bundleevent.me")["@graph"];
    expect(graph[0]).toMatchObject({
      "@type": "NewsArticle",
      headline: "Un titre court",
      datePublished: "2026-11-28",
      dateModified: "2026-11-28",
      mainEntityOfPage: "https://bundleevent.me/actualites/un-article",
    });
    expect(graph[1]["@type"]).toBe("BreadcrumbList");
  });
});

describe("lien événement → voyage", () => {
  const venue: Venue = {
    id: "oa-42",
    name: "Concert à l'Accor Arena",
    address: "8 Boulevard de Bercy, 75012 Paris",
    coords: { lat: 48.838611, lng: 2.378611 },
    city: "Paris",
    dateLabel: "12 décembre 2026",
  };

  it("fait l'aller-retour sans perte", () => {
    const link = venueLink(venue);
    expect(link.startsWith("/?")).toBe(true);
    expect(parseVenueLink(link.slice(1))).toEqual(venue);
  });

  it("ignore un lien incomplet ou aux coordonnées impossibles", () => {
    expect(parseVenueLink("")).toBeNull();
    expect(parseVenueLink("evenement=Zenith&lat=abc&lng=2")).toBeNull();
    expect(parseVenueLink("evenement=Zenith&lat=95&lng=2")).toBeNull();
    expect(parseVenueLink("lat=48&lng=2")).toBeNull();
  });

  it("tronque les textes trop longs", () => {
    const v = parseVenueLink(`evenement=${"a".repeat(500)}&lat=48&lng=2`);
    expect(v?.name.length).toBe(200);
    expect(v?.id).toBe("link-48.00000,2.00000");
  });
});
