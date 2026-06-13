"use client";

import { Step, STEPS } from "@/src/types";

interface MobileTabBarProps {
  step: Step;
  go: (s: Step) => void;
  canReach: (s: Step) => boolean;
}

export function MobileTabBar({ step, go, canReach }: MobileTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white/95 backdrop-blur-xl md:hidden">
      {STEPS.map((s) => {
        const active = s.id === step;
        const reachable = canReach(s.id);
        return (
          <button
            key={s.id}
            onClick={() => reachable && go(s.id)}
            disabled={!reachable}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-ember-ink" : reachable ? "text-slate-500" : "text-slate-300"
            }`}
          >
            <span className={`font-mono text-[10px] ${active ? "text-ember" : ""}`}>{s.n}</span>
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
