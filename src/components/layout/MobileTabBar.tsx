"use client";

import { Step } from "@/src/types";
import { IconMap, IconBed, IconBag } from "@/src/components/ui";

const NAV_ITEMS: { id: Step; label: string; Icon: (p: { size?: number; className?: string }) => React.ReactElement }[] = [
  { id: "hotels", label: "Hôtels", Icon: IconBed },
  { id: "routes", label: "Itinéraires", Icon: IconMap },
  { id: "bundle", label: "Bundle", Icon: IconBag },
];

interface MobileTabBarProps {
  step: Step;
  go: (s: Step) => void;
  canReach: (s: Step) => boolean;
}

export function MobileTabBar({ step, go, canReach }: MobileTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const active = id === step;
        const reachable = canReach(id);
        return (
          <button
            key={id}
            onClick={() => reachable && go(id)}
            disabled={!reachable}
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium leading-none transition-colors ${
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
