"use client";

import { Step, STEPS } from "@/src/types";

function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[22px] font-extrabold tracking-tight text-ink ${className}`}>
      bundle<span className="text-ember">.</span>
    </span>
  );
}

interface HeaderProps {
  step: Step;
  go: (s: Step) => void;
  canReach: (s: Step) => boolean;
}

export function Header({ step, go, canReach }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line bg-white/90 px-5 py-3 backdrop-blur-xl md:px-8">
      <button onClick={() => go("home")} className="shrink-0">
        <Brand />
      </button>
      <nav className="mx-auto hidden items-center gap-1 md:flex">
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const reachable = canReach(s.id);
          return (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => reachable && go(s.id)}
                disabled={!reachable}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 transition-colors ${
                  active ? "bg-ink text-white" : reachable ? "text-slate-500 hover:bg-mist" : "text-slate-300"
                }`}
              >
                <span className="font-mono text-[10px] tracking-widest">{s.n}</span>
                <span className="text-[13px] font-medium">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-3 bg-line" />}
            </div>
          );
        })}
      </nav>
      <div className="ml-auto hidden items-center gap-3 md:flex">
        <span className="text-[11px] font-medium tracking-widest text-slate-400">FR · €</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[12px] font-semibold text-white">
          BE
        </span>
      </div>
    </header>
  );
}
