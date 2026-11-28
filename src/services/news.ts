import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NewsArticle } from "@/src/types";
import { parseNewsArticle, sortNews } from "@/src/utils/news";

export const NEWS_DIR = join(process.cwd(), "src/content/news");

export function loadNewsFrom(dir: string): NewsArticle[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const articles = files.map((f) => {
    const article = parseNewsArticle(JSON.parse(readFileSync(join(dir, f), "utf8")), f);
    if (`${article.slug}.json` !== f) throw new Error(`${f}: le nom du fichier doit être ${article.slug}.json`);
    return article;
  });
  return sortNews(articles);
}

let cache: NewsArticle[] | null = null;

export function getAllNews(): NewsArticle[] {
  if (!cache) cache = loadNewsFrom(NEWS_DIR);
  return cache;
}

export function getNewsBySlug(slug: string): NewsArticle | undefined {
  return getAllNews().find((a) => a.slug === slug);
}
