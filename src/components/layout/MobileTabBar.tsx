"use client";

import { Step, MobileTabBarProps } from "@/src/types";
import { IconMap, IconBed, IconBag } from "@/src/components/ui";

const BASE_NAV_ITEMS: { id: Step; label: string; Icon: (p: { size?: number; className?: string }) => React.ReactElement }[] = [
  { id: "hotels", label: "Logement", Icon: IconBed },
  { id: "routes-outbound", label: "Aller", Icon: IconMap },
  { id: "routes-return", label: "Retour", Icon: IconMap },
  { id: "bundle", label: "Bundle", Icon: IconBag },
];

export function MobileTabBar({ step, go, canReach, roundTrip }: MobileTabBarProps) {
  const items = BASE_NAV_ITEMS.filter((i) => roundTrip || i.id !== "routes-return");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map(({ id, label, Icon }) => {
        const active = id === step;
        const reachable = canReach(id);
        return (
          <button
            key={id}
            onClick={() => reachable && go(id)}
            disabled={!reachable}
            className={`flex flex-1 min-w-[70px] min-h-[60px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium leading-none transition-colors ${
              active ? "text-ember-ink" : reachable ? "text-slate-500" : "text-slate-300"
            }`}
          >
            <Icon size={22} className="shrink-0 overflow-visible" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
