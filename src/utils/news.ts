import type { NewsArticle, NewsBlock, NewsSource } from "@/src/types";
import { siteConfig } from "@/src/config";

export const NEWS_PATH = "/actualites";
export const NEWS_TITLE_MAX = 70;
export const NEWS_DESCRIPTION_MIN = 110;
export const NEWS_DESCRIPTION_MAX = 160;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

function parseBlock(raw: unknown, where: string): NewsBlock {
  const b = raw as Record<string, unknown>;
  if (b?.type === "h2" || b?.type === "p") {
    if (!isText(b.text)) throw new Error(`${where}: bloc ${b.type} sans texte`);
    return { type: b.type, text: b.text };
  }
  if (b?.type === "ul") {
    if (!Array.isArray(b.items) || b.items.length === 0 || !b.items.every(isText)) {
      throw new Error(`${where}: liste vide ou invalide`);
    }
    return { type: "ul", items: b.items };
  }
  throw new Error(`${where}: type de bloc inconnu`);
}

function parseSource(raw: unknown, where: string): NewsSource {
  const s = raw as Record<string, unknown>;
  if (!isText(s?.title) || !isText(s?.publisher) || !isText(s?.url)) throw new Error(`${where}: source incomplète`);
  if (!/^https:\/\//.test(s.url)) throw new Error(`${where}: l'URL de source doit être en https`);
  return { title: s.title, publisher: s.publisher, url: s.url };
}

export function parseNewsArticle(raw: unknown, file = "article"): NewsArticle {
  const a = raw as Record<string, unknown>;
  if (!a || typeof a !== "object") throw new Error(`${file}: JSON invalide`);
  if (!isText(a.slug) || !SLUG_RE.test(a.slug)) throw new Error(`${file}: slug invalide (minuscules, chiffres et tirets)`);
  if (!isText(a.title) || a.title.length > NEWS_TITLE_MAX) throw new Error(`${file}: titre manquant ou plus long que ${NEWS_TITLE_MAX} caractères`);
  if (!isText(a.description) || a.description.length < NEWS_DESCRIPTION_MIN || a.description.length > NEWS_DESCRIPTION_MAX) {
    throw new Error(`${file}: description entre ${NEWS_DESCRIPTION_MIN} et ${NEWS_DESCRIPTION_MAX} caractères`);
  }
  if (!isText(a.publishedAt) || !ISO_DATE_RE.test(a.publishedAt)) throw new Error(`${file}: publishedAt au format AAAA-MM-JJ`);
  if (a.updatedAt !== undefined && (!isText(a.updatedAt) || !ISO_DATE_RE.test(a.updatedAt))) {
    throw new Error(`${file}: updatedAt au format AAAA-MM-JJ`);
  }
  if (!isText(a.author)) throw new Error(`${file}: auteur manquant`);
  if (!isText(a.lead)) throw new Error(`${file}: chapeau (lead) manquant`);
  if (!Array.isArray(a.tags) || !a.tags.every(isText)) throw new Error(`${file}: tags invalides`);
  if (!Array.isArray(a.blocks) || a.blocks.length === 0) throw new Error(`${file}: aucun bloc de contenu`);
  if (!Array.isArray(a.sources) || a.sources.length < 2) throw new Error(`${file}: au moins deux sources`);
  const blocks = a.blocks.map((b, i) => parseBlock(b, `${file} bloc ${i + 1}`));
  if (!blocks.some((b) => b.type === "h2")) throw new Error(`${file}: au moins un intertitre h2`);
  return {
    slug: a.slug,
    title: a.title,
    description: a.description,
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt as string | undefined,
    author: a.author,
    tags: a.tags,
    lead: a.lead,
    blocks,
    sources: a.sources.map((s, i) => parseSource(s, `${file} source ${i + 1}`)),
  };
}

export function sortNews(articles: NewsArticle[]): NewsArticle[] {
  return [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
}

export function readingMinutes(article: NewsArticle): number {
  const words = [article.lead, ...article.blocks.flatMap((b) => (b.type === "ul" ? b.items : [b.text]))]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function formatNewsDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

export function newsUrl(slug: string, baseUrl: string = siteConfig.url): string {
  return `${baseUrl}${NEWS_PATH}/${slug}`;
}

export function buildNewsArticleJsonLd(article: NewsArticle, baseUrl: string = siteConfig.url) {
  const url = newsUrl(article.slug, baseUrl);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        mainEntityOfPage: url,
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt ?? article.publishedAt,
        inLanguage: siteConfig.language,
        keywords: article.tags.join(", "),
        image: [`${url}/opengraph-image`],
        author: { "@type": "Organization", name: article.author, url: `${baseUrl}/` },
        publisher: { "@id": `${baseUrl}/#organization` },
        citation: article.sources.map((s) => s.url),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${baseUrl}/` },
          { "@type": "ListItem", position: 2, name: "Actualités", item: `${baseUrl}${NEWS_PATH}` },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  };
}
