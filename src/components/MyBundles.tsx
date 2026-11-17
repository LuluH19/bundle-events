"use client";

import Link from "next/link";
import type { BundleSummary } from "@/src/types";
import { useMyBundles } from "@/src/hooks/useMyBundles";
import { formatDay } from "@/src/utils/date";
import { IconArrow, IconBed, IconCalendar, IconPin, IconTicket } from "@/src/components/ui";

function BundleCard({ bundle }: { bundle: BundleSummary }) {
  const { venue, departure, checkin, checkout, roundTrip, selectedHotel } = bundle.data;
  const dates = [formatDay(checkin), roundTrip ? formatDay(checkout) : ""].filter(Boolean).join(" → ");

  return (
    <Link
      href={`/${bundle.uuid}/reserver`}
      className="group grid gap-2 rounded-2xl bg-white p-4 ring-1 ring-line transition-shadow hover:ring-ink/40"
    >
      <span className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-billet-soft text-billet">
          <IconTicket size={18} />
        </span>
        <b className="min-w-0 flex-1 truncate text-[15px] text-ink">{venue?.name ?? "Événement à choisir"}</b>
        <IconArrow size={16} className="shrink-0 text-slate-400 transition-colors group-hover:text-ink" />
      </span>
      {departure && (
        <span className="flex items-center gap-2 text-[13px] text-slate-500">
          <IconPin size={14} className="shrink-0" />
          <span className="truncate">Depuis {departure.name}</span>
        </span>
      )}
      {dates && (
        <span className="flex items-center gap-2 text-[13px] text-slate-500">
          <IconCalendar size={14} className="shrink-0" />
          <span className="truncate">{dates}</span>
        </span>
      )}
      {selectedHotel && (
        <span className="flex items-center gap-2 text-[13px] text-slate-500">
          <IconBed size={14} className="shrink-0" />
          <span className="truncate">{selectedHotel.name}</span>
        </span>
      )}
    </Link>
  );
}

export function MyBundles() {
  const { bundles, loading, error } = useMyBundles();

  return (
    <section id="mes-bundles" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-12 md:px-8">
      <h2 className="font-display text-[26px] font-extrabold text-ink md:text-[32px]">Mes bundles</h2>
      <p className="mt-1 text-[15px] text-slate-500">Retrouve tous les voyages que tu as préparés.</p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && [0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-mist" />)}
        {!loading && error && (
          <p className="text-[14px] text-slate-500">Impossible de charger tes bundles pour le moment. Réessaie plus tard.</p>
        )}
        {!loading && !error && bundles.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-white p-4 text-[14px] text-slate-500 sm:col-span-2 lg:col-span-3">
            Tu n&apos;as pas encore de bundle. Lance une recherche plus haut : il apparaîtra ici automatiquement.
          </p>
        )}
        {!loading && !error && bundles.map((b) => <BundleCard key={b.uuid} bundle={b} />)}
      </div>
    </section>
  );
}
