import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/src/components/layout/PageShell";
import { IconArrow } from "@/src/components/ui";
import { getAllNews } from "@/src/services/news";
import { formatNewsDate, NEWS_PATH, readingMinutes } from "@/src/utils/news";

const TITLE = "Actualités concerts, festivals et transports";
const DESCRIPTION =
  "Dates de festivals, billets de train, grèves, bons plans : l'actualité utile pour aller à ton concert, ton match ou ton festival, par l'équipe Bundle Events.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: NEWS_PATH },
  openGraph: { type: "website", url: NEWS_PATH, title: TITLE, description: DESCRIPTION },
};

export default function NewsIndexPage() {
  const articles = getAllNews();

  return (
    <PageShell crumbs={[{ href: "/", label: "Accueil" }, { label: "Actualités" }]}>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-8">
        <span className="eyebrow text-billet">Le journal de la route</span>
        <h1 className="mt-2 font-display text-[34px] font-extrabold leading-tight text-ink md:text-[48px]">Actualités</h1>
        <p className="mt-3 max-w-2xl text-[16px] text-slate-500">
          Dates de festivals, billets de train, grèves : ce qu&apos;il faut savoir pour aller à ton concert, ton match ou ton festival.
        </p>

        {articles.length === 0 ? (
          <p className="mt-8 text-[15px] text-slate-500">Aucune actualité pour l&apos;instant.</p>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {articles.map((a) => (
              <li key={a.slug}>
                <article className="flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-line transition-shadow hover:ring-ink/40">
                  <p className="text-[13px] text-slate-500">
                    <time dateTime={a.publishedAt}>{formatNewsDate(a.publishedAt)}</time> · {readingMinutes(a)} min de lecture
                  </p>
                  <h2 className="mt-2 font-display text-[21px] font-extrabold leading-snug text-ink">
                    <Link href={`${NEWS_PATH}/${a.slug}`} className="hover:text-billet">
                      {a.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-[15px] text-slate-500">{a.description}</p>
                  <Link
                    href={`${NEWS_PATH}/${a.slug}`}
                    aria-label={`Lire l'article : ${a.title}`}
                    className="mt-auto flex items-center gap-1.5 pt-4 text-[14px] font-bold text-ink hover:text-billet"
                  >
                    Lire l&apos;article <IconArrow size={14} />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
