export type NewsBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export interface NewsSource {
  title: string;
  publisher: string;
  url: string;
}

export interface NewsArticle {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  tags: string[];
  lead: string;
  blocks: NewsBlock[];
  sources: NewsSource[];
}
