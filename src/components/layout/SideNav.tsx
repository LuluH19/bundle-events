"use client";

import { Step, SideNavProps } from "@/src/types";
import { IconMap, IconBed, IconBag } from "@/src/components/ui";

const BASE_NAV_ITEMS: { id: Step; label: string; Icon: (p: { size?: number; className?: string }) => React.ReactElement }[] = [
  { id: "hotels", label: "Mon logement", Icon: IconBed },
  { id: "routes-outbound", label: "Trajet aller", Icon: IconMap },
  { id: "routes-return", label: "Trajet retour", Icon: IconMap },
  { id: "bundle", label: "Mon Bundle final", Icon: IconBag },
];

export function SideNav({ step, go, canReach, venue, roundTrip }: SideNavProps) {
  const items = BASE_NAV_ITEMS.filter((i) => roundTrip || i.id !== "routes-return");
  return (
    <aside className="sticky top-[65px] hidden h-[calc(100dvh-65px)] w-64 shrink-0 flex-col border-r border-line bg-page p-4 lg:flex">
      <div className="px-4 py-6">
        <h2 className="font-display text-lg font-extrabold leading-tight text-ink">
          {venue ? venue.name : "Votre parcours"}
        </h2>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          {venue?.address || "Bundle Events"}
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map(({ id, label, Icon }) => {
          const active = id === step;
          const reachable = canReach(id);
          return (
            <button
              key={id}
              onClick={() => reachable && go(id)}
              disabled={!reachable}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
                active
                  ? "bg-white font-bold text-ember-ink shadow-sm"
                  : reachable
                    ? "text-slate-600 hover:translate-x-1 hover:bg-mist"
                    : "cursor-not-allowed text-slate-300"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
