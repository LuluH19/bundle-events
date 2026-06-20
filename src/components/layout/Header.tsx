"use client";

import { Step } from "@/src/types";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Événements", href: "#" },
  { label: "Actualités", href: "#" },
  { label: "Contact", href: "#" },
];

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

export function Header({ go }: HeaderProps) {
  const startBundle = () => {
    go("home");
    setTimeout(
      () => document.getElementById("search-card")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      60
    );
  };

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line bg-white/90 px-5 py-3 backdrop-blur-xl md:px-8">
      <button onClick={() => go("home")} className="shrink-0">
        {/* <Brand /> */}
      </button>
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
        {/* {NAV_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="text-[14px] font-medium text-slate-600 transition-colors hover:text-ink"
          >
            {l.label}
          </a>
        ))} */}
      </nav>
      <button
        onClick={startBundle}
        className="ml-auto shrink-0 rounded-[4px] bg-ember-ink px-[20px] py-[8px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Créer mon bundle
      </button>
    </header>
  );
}
