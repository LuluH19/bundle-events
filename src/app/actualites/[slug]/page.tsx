import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/src/components/layout/PageShell";
import { IconArrow, IconExternal } from "@/src/components/ui";
import { getAllNews, getNewsBySlug } from "@/src/services/news";
import { serializeJsonLd } from "@/src/utils/seo";
import { buildNewsArticleJsonLd, formatNewsDate, NEWS_PATH, readingMinutes } from "@/src/utils/news";
import type { NewsBlock } from "@/src/types";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllNews().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getNewsBySlug((await params).slug);
  if (!article) return {};
  const url = `${NEWS_PATH}/${article.slug}`;
  return {
    title: { absolute: article.title },
    description: article.description,
    keywords: article.tags,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: [article.author],
      tags: article.tags,
    },
    twitter: { card: "summary_large_image", title: article.title, description: article.description },
  };
}

function Block({ block }: { block: NewsBlock }) {
  if (block.type === "h2") return <h2 className="mt-8 font-display text-[24px] font-extrabold leading-snug text-ink">{block.text}</h2>;
  if (block.type === "ul") {
    return (
      <ul className="mt-3 grid list-disc gap-2 pl-5 text-[16px] leading-relaxed text-ink marker:text-billet">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p className="mt-3 text-[16px] leading-relaxed text-ink">{block.text}</p>;
}

export default async function NewsArticlePage({ params }: Props) {
  const article = getNewsBySlug((await params).slug);
  if (!article) notFound();
  const others = getAllNews()
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3);

  return (
    <PageShell crumbs={[{ href: "/", label: "Accueil" }, { href: NEWS_PATH, label: "Actualités" }, { label: article.title }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildNewsArticleJsonLd(article)) }} />
      <article className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:px-8">
        <header>
          <p className="text-[13px] text-slate-500">
            <time dateTime={article.publishedAt}>{formatNewsDate(article.publishedAt)}</time>
            {article.updatedAt && (
              <>
                {" "}· mis à jour le <time dateTime={article.updatedAt}>{formatNewsDate(article.updatedAt)}</time>
              </>
            )}{" "}
            · {readingMinutes(article)} min de lecture · {article.author}
          </p>
          <h1 className="mt-3 font-display text-[32px] font-extrabold leading-tight text-ink md:text-[44px]">{article.title}</h1>
          <p className="mt-4 text-[18px] font-semibold leading-relaxed text-slate-600">{article.lead}</p>
        </header>

        <div className="mt-2">
          {article.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 rounded-2xl bg-nuit p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-[20px] font-extrabold">Tu as ton billet ? On s&apos;occupe du reste.</p>
            <p className="mt-1 text-[14px] text-white/80">Trajet, hôtel près de la salle et retour, en une seule recherche.</p>
          </div>
          <Link href="/" className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-billet px-5 text-[15px] font-bold text-white hover:bg-billet-600">
            Organiser mon voyage <IconArrow size={16} />
          </Link>
        </div>

        <section aria-labelledby="sources" className="mt-10">
          <h2 id="sources" className="font-display text-[18px] font-extrabold text-ink">
            Sources
          </h2>
          <ul className="mt-3 grid gap-2 text-[14px]">
            {article.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 text-ink hover:text-billet">
                  <span>
                    {s.title} <span className="text-slate-500">— {s.publisher}</span>
                  </span>
                  <IconExternal size={13} className="mt-1 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {others.length > 0 && (
          <section aria-labelledby="a-lire-aussi" className="mt-10 border-t border-line pt-8">
            <h2 id="a-lire-aussi" className="font-display text-[18px] font-extrabold text-ink">
              À lire aussi
            </h2>
            <ul className="mt-3 grid gap-2">
              {others.map((a) => (
                <li key={a.slug}>
                  <Link href={`${NEWS_PATH}/${a.slug}`} className="text-[15px] font-semibold text-ink hover:text-billet">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/evenements" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-bold text-ink hover:text-billet">
              Voir les événements à venir <IconArrow size={14} />
            </Link>
          </section>
        )}
      </article>
    </PageShell>
  );
}
