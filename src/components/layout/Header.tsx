"use client";

import Image from "next/image";
import { Step } from "@/src/types";

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
      <button onClick={() => go("home")} aria-label="Accueil Bundle Events" className="shrink-0">
        <Image
          src="/favicon/favicon.svg"
          alt="Bundle Events"
          width={40}
          height={40}
          loading="lazy"
          unoptimized
          className="h-16 w-auto"
        />
      </button>
      {/* <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          <a
            key="Événements"
            href="#"
            aria-label="Événements"
            className="text-[14px] font-medium text-slate-600 transition-colors hover:text-ink"
          >
            Événements
          </a>
          <a
            key="Actualités"
            href="#"
            aria-label="Actualités"
            className="text-[14px] font-medium text-slate-600 transition-colors hover:text-ink"
          >
            Actualités
          </a>
          <a
            key="Contact"
            href="#"
            aria-label="Contact"
            className="text-[14px] font-medium text-slate-600 transition-colors hover:text-ink"
          >
            Contact
          </a>
      </nav> */}
      {/* <button
        onClick={startBundle}
        className="ml-auto shrink-0 rounded-[4px] bg-ember-ink px-[20px] py-[8px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Créer mon bundle
      </button> */}
    </header>
  );
}