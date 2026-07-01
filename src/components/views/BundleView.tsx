"use client";

import Image from "next/image";
import { Location, RouteOption, HotelMapItem, Step } from "@/src/types";
import { formatDuration, formatDistance } from "@/src/utils/format";
import { MODE_META } from "@/src/utils/constants/transport";
import {
  Button,
  Chip,
  IconArrow,
  IconBed,
  IconCheck,
  IconLeaf,
  IconMap,
  IconPin,
  IconStar,
  MODE_ICON,
} from "@/src/components/ui";

interface BundleViewProps {
  departure: Location | null;
  venue: Location | null;
  dateLabel: string;
  selectedOption: RouteOption | null;
  selectedHotel: HotelMapItem | null;
  checkin: string;
  checkout: string;
  onEdit: (s: Step) => void;
}

export function BundleView(props: BundleViewProps) {
  const { departure, venue, dateLabel, selectedOption, selectedHotel, checkin, checkout, onEdit } = props;

  const nights = Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000));
  const transportCost = selectedOption ? selectedOption.price : 0;
  const hotelCost = selectedHotel?.pricePerNight ? selectedHotel.pricePerNight * nights : 0;
  const total = transportCost + hotelCost;

  const mode = selectedOption?.mode ?? null;
  const modeMeta = mode ? MODE_META[mode] : null;
  const ModeIcon = mode ? MODE_ICON[mode] : null;
  const bundleId = `BE-${(total * 7 + 100000).toString().slice(0, 6)}-FR`;
  const stars = selectedHotel?.stars ?? (selectedHotel?.rating ? Math.round(selectedHotel.rating) : 0);

  const hotelFacts: { icon: React.ReactNode; label: string }[] = [];
  if (selectedHotel) {
    if (selectedHotel.stars) hotelFacts.push({ icon: <IconStar size={18} />, label: `${selectedHotel.stars} étoiles` });
    if (selectedHotel.rating) hotelFacts.push({ icon: <IconCheck size={18} />, label: `Note ${selectedHotel.rating}` });
    hotelFacts.push({ icon: <IconBed size={18} />, label: `${nights} nuit${nights > 1 ? "s" : ""}` });
    if (selectedHotel.pricePerNight)
      hotelFacts.push({ icon: <IconLeaf size={18} />, label: `€${selectedHotel.pricePerNight} / nuit` });
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      {/* Header */}
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Chip>Bundle Summary</Chip>
          <h1 className="font-display text-[40px] font-extrabold leading-[0.98] tracking-[-0.02em] text-ink md:text-[56px]">
            Votre escapade,
            <br />
            <span className="text-ember">assemblée.</span>
          </h1>
          <p className="max-w-lg text-[15px] text-slate-500 md:text-[17px]">
            Chaque détail de votre voyage vers {venue?.name ?? "votre événement"} réuni dans un seul bundle premium.
          </p>
        </div>
        <div className="flex flex-col items-start rounded-2xl bg-white p-6 ring-1 ring-line md:items-end">
          <span className="eyebrow text-slate-400">Total estimé</span>
          <span className="mt-1 font-display text-[40px] font-extrabold text-ink">€{total.toLocaleString("fr-FR")}</span>
          <p className="mt-1 text-[12px] text-slate-400">Taxes et frais locaux estimés inclus</p>
        </div>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-5 md:gap-6">
        {/* Transport */}
        <section className="col-span-12 flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_48px_-24px_rgba(0,17,58,0.35)] ring-1 ring-line lg:col-span-7">
          <div className="relative h-44 overflow-hidden bg-gradient-to-br from-navy to-ink">
            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_-10%,rgba(249,108,26,0.35),transparent_55%)]" />
            <div className="absolute bottom-6 left-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-md">
                {ModeIcon ? <ModeIcon size={22} /> : <IconMap size={22} />}
              </span>
              <div>
                <h2 className="font-display text-[22px] font-bold leading-tight text-white">
                  {modeMeta ? modeMeta.label : "Trajet"}
                </h2>
                {modeMeta && <p className="text-[13px] text-white/60">{modeMeta.provider}</p>}
              </div>
            </div>
          </div>

          {selectedOption ? (
            <div className="flex flex-grow flex-col p-7 md:p-8">
              <div className="mb-7 grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="eyebrow text-slate-400">Départ</p>
                  <p className="truncate text-[17px] font-bold text-ink">{departure?.name ?? "—"}</p>
                  <p className="text-[13px] text-slate-500">{dateLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="eyebrow text-slate-400">Arrivée</p>
                  <p className="truncate text-[17px] font-bold text-ink">{venue?.name ?? "—"}</p>
                  <p className="text-[13px] text-slate-500">
                    {formatDuration(selectedOption.durationMin)} · {formatDistance(selectedOption.distanceKm)}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-line pt-6">
                <div>
                  <p className="font-display text-[24px] font-extrabold text-ink">€{transportCost.toLocaleString("fr-FR")}</p>
                  <p className="text-[12px] text-slate-400">Prix du trajet estimé</p>
                </div>
                <button
                  onClick={() => onEdit("routes")}
                  className="flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-navy-700"
                >
                  Modifier le trajet
                  <IconArrow size={15} />
                </button>
              </div>
            </div>
          ) : (
            <EmptyBlock label="Aucun trajet sélectionné" cta="Choisir un trajet" onClick={() => onEdit("routes")} />
          )}
        </section>

        {/* Destination route widget */}
        <section className="col-span-12 flex flex-col justify-between rounded-[2rem] bg-mist p-6 ring-1 ring-line lg:col-span-5">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-[18px] font-bold text-ink">
              <IconMap size={18} className="text-ember" /> Itinéraire
            </h3>
            <div className="relative h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-ink">
              <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_50%_0%,rgba(255,255,255,0.12),transparent_60%)]" />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/90 p-4 shadow-xl backdrop-blur-xl">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ember text-white">
                    <IconPin size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{selectedHotel?.name ?? venue?.name ?? "Destination"}</p>
                    <p className="truncate text-[12px] text-slate-500">
                      {selectedHotel?.locationName || venue?.address || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white p-4">
              <p className="eyebrow text-slate-400">Temps de trajet</p>
              <p className="font-display text-[18px] font-extrabold text-ink">
                {selectedOption ? formatDuration(selectedOption.durationMin) : "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="eyebrow text-slate-400">Empreinte CO₂</p>
              <p className="flex items-center gap-1.5 font-display text-[18px] font-extrabold text-ink">
                <IconLeaf size={16} className="text-[#0d5c63]" /> {modeMeta ? modeMeta.co2 : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Hotel */}
        <section className="col-span-12 flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_48px_-24px_rgba(0,17,58,0.35)] ring-1 ring-line md:flex-row">
          <div className="relative h-64 w-full shrink-0 overflow-hidden bg-gradient-to-br from-navy to-ink md:h-auto md:w-2/5">
            {selectedHotel?.photo ? (
              <Image
                src={selectedHotel.photo}
                alt={selectedHotel.name}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                quality={75}
                loading="lazy"
                preload={false}
                decoding="async"
                placeholder="empty"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/40">
                <IconBed size={40} />
              </div>
            )}
            <div className="absolute left-6 top-6">
              <span className="rounded-full bg-ember px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white shadow-lg">
                Hébergement
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between p-7 md:p-10">
            {selectedHotel ? (
              <>
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <h2 className="font-display text-[26px] font-extrabold leading-tight text-ink md:text-[30px]">
                        {selectedHotel.name}
                      </h2>
                      <div className="flex items-center gap-1 text-ember">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <IconStar key={i} size={16} className={i < stars ? "text-ember" : "text-line"} />
                        ))}
                        {selectedHotel.rating && (
                          <span className="ml-2 text-[13px] font-medium text-slate-400">{selectedHotel.rating} / 5</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[26px] font-black text-ink md:text-[30px]">
                        €{hotelCost.toLocaleString("fr-FR")}
                      </p>
                      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        {nights} nuit{nights > 1 ? "s" : ""} {selectedHotel.type ? `· ${selectedHotel.type}` : ""}
                      </p>
                    </div>
                  </div>

                  {hotelFacts.length > 0 && (
                    <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {hotelFacts.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-slate-600">
                          <span className="text-ember">{f.icon}</span>
                          <span className="text-[13px]">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => onEdit("hotels")}
                    className="rounded-xl border border-line px-6 py-3.5 text-[14px] font-bold text-slate-600 transition-colors hover:bg-mist"
                  >
                    Changer d&apos;hôtel
                  </button>
                  {selectedHotel.website ? (
                    <a
                      href={selectedHotel.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-ember px-7 py-3.5 text-[14px] font-bold text-white transition-all hover:bg-ember-600 active:scale-95"
                    >
                      Réserver l&apos;hôtel <IconArrow size={15} />
                    </a>
                  ) : (
                    <Button kind="primary" className="rounded-xl">
                      Réserver l&apos;hôtel <IconArrow size={15} />
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <EmptyBlock label="Aucun hôtel sélectionné" cta="Choisir un hôtel" onClick={() => onEdit("hotels")} />
            )}
          </div>
        </section>

        {/* Logistics */}
        <section className="col-span-12 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          <LogisticsCard icon={<IconMap size={20} />} title="Fenêtre de voyage" value={dateLabel} hint={`${nights} jour${nights > 1 ? "s" : ""} sur place`} />
          <LogisticsCard icon={<IconCheck size={20} />} title="Référence du bundle" value="Paiement en attente" hint={`Bundle ID ${bundleId}`} />
          <LogisticsCard
            icon={<IconLeaf size={20} />}
            title="Empreinte carbone"
            value={modeMeta ? `Impact ${modeMeta.co2.toLowerCase()}` : "—"}
            hint={modeMeta ? `Via ${modeMeta.provider}` : "Trajet non défini"}
          />
        </section>
      </div>

      {/* Final action */}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-slate-400">Tarif garanti pendant 24 h · {bundleId}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button kind="ghost" onClick={() => onEdit("home")} className="sm:w-auto">
            Modifier
          </Button>
          <Button kind="primary" disabled={!selectedOption || !selectedHotel}>
            Réserver mon bundle <IconArrow size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyBlock({ label, cta, onClick }: { label: string; cta: string; onClick: () => void }) {
  return (
    <div className="flex flex-grow flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="text-[14px] text-slate-400">{label}</p>
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-navy-700"
      >
        {cta}
        <IconArrow size={15} />
      </button>
    </div>
  );
}

function LogisticsCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-mist p-6 ring-1 ring-line">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-ink">{icon}</span>
        <h4 className="font-bold text-ink">{title}</h4>
      </div>
      <p className="text-[14px] text-slate-600">{value}</p>
      <p className="mt-1 text-[12px] text-slate-400">{hint}</p>
    </div>
  );
}
