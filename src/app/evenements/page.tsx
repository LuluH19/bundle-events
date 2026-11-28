import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/src/components/layout/PageShell";
import { IconArrow, IconTicket } from "@/src/components/ui";
import { eventsConfig } from "@/src/config";
import { listCityEvents } from "@/src/services/event-search";
import { cityAnchor, EVENT_CITIES } from "@/src/utils/constants/cities";
import { venueLink } from "@/src/utils/venue-link";

export const revalidate = 21600;

const TITLE = "Concerts, festivals et matchs à venir en France";
const DESCRIPTION =
  "Les concerts, festivals, spectacles et matchs à venir à Paris, Lyon, Marseille, Bordeaux, Lille, Toulouse et Nantes. Choisis ton événement, on organise le voyage.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/evenements" },
  openGraph: { type: "website", url: "/evenements", title: TITLE, description: DESCRIPTION },
};

export default async function EventsPage() {
  const groups = (await listCityEvents(EVENT_CITIES, eventsConfig.eventsPageLimit).catch(() => [])).filter((g) => g.events.length > 0);

  return (
    <PageShell crumbs={[{ href: "/", label: "Accueil" }, { label: "Événements" }]}>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-8">
        <span className="eyebrow text-billet">Concerts · matchs · festivals</span>
        <h1 className="mt-2 font-display text-[34px] font-extrabold leading-tight text-ink md:text-[48px]">Les événements à venir</h1>
        <p className="mt-3 max-w-2xl text-[16px] text-slate-500">
          Choisis un événement : on te propose le trajet de porte à porte, un hôtel près de la salle et le retour.
        </p>

        {groups.length > 0 && (
          <nav aria-label="Villes" className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
            {groups.map((g) => (
              <a
                key={g.city}
                href={`#${cityAnchor(g.city)}`}
                className="shrink-0 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink ring-1 ring-inset ring-line hover:bg-mist"
              >
                {g.city}
              </a>
            ))}
          </nav>
        )}

        {groups.length === 0 && (
          <p className="mt-8 text-[15px] text-slate-500">
            On n&apos;a pas pu charger les événements pour l&apos;instant.{" "}
            <Link href="/" className="font-semibold text-ink underline hover:text-billet">
              Cherche directement ta salle
            </Link>
            .
          </p>
        )}

        {groups.map((g) => (
          <section key={g.city} id={cityAnchor(g.city)} aria-labelledby={`titre-${cityAnchor(g.city)}`} className="mt-10 scroll-mt-24">
            <h2 id={`titre-${cityAnchor(g.city)}`} className="font-display text-[24px] font-extrabold text-ink md:text-[28px]">
              Événements à {g.city}
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.events.map((v) => (
                <li key={v.id}>
                  <Link
                    href={venueLink(v)}
                    className="flex h-full flex-col items-start gap-1 rounded-2xl bg-white p-4 ring-1 ring-line transition-shadow hover:ring-ink/40"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-billet-soft text-billet">
                      <IconTicket size={18} />
                    </span>
                    <b className="mt-1 text-[15px] leading-snug text-ink">{v.name}</b>
                    {v.address && <span className="text-[13px] text-slate-500">{v.address}</span>}
                    {v.dateLabel && <span className="text-[13px] font-semibold text-slate-600">{v.dateLabel}</span>}
                    <span className="mt-auto flex items-center gap-1.5 pt-3 text-[14px] font-bold text-ink">
                      Organiser mon voyage <IconArrow size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </PageShell>
  );
}
