"use client";

import { Location, RouteOption, HotelMapItem, Step } from "@/src/types";
import { formatDuration } from "@/src/utils/format";
import { MODE_META } from "@/src/utils/constants/transport";
import { Button, Eyebrow, IconArrow, IconPin, IconStar, MODE_ICON } from "@/src/components/ui";
import Image from "next/image";

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

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
      <Eyebrow className="mb-2">Bundle Summary</Eyebrow>
      <h1 className="font-display text-[36px] font-extrabold leading-tight tracking-[-0.02em] text-ink md:text-[56px]">
        Votre escapade,
        <br />
        <span className="text-ember">assemblée.</span>
      </h1>
      <p className="mt-3 text-[15px] text-slate-500">
        {venue?.name} · {dateLabel} · {nights} nuit{nights > 1 ? "s" : ""}
      </p>

      {/* Total card */}
      <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-ink p-7 text-white shadow-[0_24px_60px_-24px_rgba(0,17,58,0.6)]">
        <Eyebrow className="text-ember-soft">Total estimé</Eyebrow>
        <div className="mt-1 font-display text-[44px] font-extrabold md:text-[56px]">
          €{total.toLocaleString("fr-FR")}
        </div>
        <p className="text-[13px] text-white/50">Taxes et frais locaux estimés inclus</p>
      </div>

      {/* Line items */}
      <div className="mt-6 flex flex-col gap-4">
        <BundleRow
          eyebrow="Transport"
          title={selectedOption ? MODE_META[selectedOption.mode].label : "—"}
          subtitle={
            selectedOption
              ? `${departure?.name} → ${venue?.name} · ${formatDuration(selectedOption.durationMin)}`
              : "Aucun trajet sélectionné"
          }
          price={transportCost ? `€${transportCost}` : "—"}
          onEdit={() => onEdit("routes")}
          icon={selectedOption ? MODE_ICON[selectedOption.mode]({ size: 22 }) : null}
        />
        <BundleRow
          eyebrow="Hébergement"
          title={selectedHotel?.name || "—"}
          subtitle={
            selectedHotel
              ? `${nights} nuit${nights > 1 ? "s" : ""}${selectedHotel.pricePerNight ? ` · €${selectedHotel.pricePerNight}/nuit` : ""}`
              : "Aucun hôtel sélectionné"
          }
          price={hotelCost ? `€${hotelCost.toLocaleString("fr-FR")}` : "—"}
          onEdit={() => onEdit("hotels")}
          icon={<IconPin size={22} />}
          photo={selectedHotel?.photo}
        />
        <BundleRow
          eyebrow="Événement"
          title={venue?.name || "—"}
          subtitle={venue?.address || ""}
          price="Inclus"
          onEdit={() => onEdit("home")}
          icon={<IconStar size={20} />}
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button kind="primary" className="flex-1">
          Réserver mon bundle <IconArrow size={16} />
        </Button>
        <Button kind="ghost" onClick={() => onEdit("home")} className="sm:w-auto">
          Modifier
        </Button>
      </div>
      <p className="mt-3 text-center text-[12px] text-slate-400">
        Tarif garanti pendant 24 h · Bundle ID provisoire BE-{(total * 7 + 100000).toString().slice(0, 6)}-FR
      </p>
    </div>
  );
}

interface BundleRowProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  price: string;
  onEdit: () => void;
  icon: React.ReactNode;
  photo?: string;
}

function BundleRow({ eyebrow, title, subtitle, price, onEdit, icon, photo }: BundleRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist text-ink">
        {photo ? (
          <Image
            src={photo}
            alt={title}
            width={56}
            height={56}
            quality={75}
            preload={false}
            placeholder="empty"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="eyebrow text-slate-400">{eyebrow}</div>
        <div className="truncate font-display text-[17px] font-bold text-ink">{title}</div>
        <div className="truncate text-[13px] text-slate-500">{subtitle}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-[18px] font-bold text-ink">{price}</div>
        <button onClick={onEdit} className="text-[12px] font-medium text-ember-ink hover:underline">
          Modifier
        </button>
      </div>
    </div>
  );
}
