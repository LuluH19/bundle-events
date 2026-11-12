"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "@/src/components/LogoLoader";

export function LoadingScreen({
  title = "On ouvre ton voyage",
  messages = ["On récupère ton voyage…"],
  overlay = false,
  embedded = false,
}: {
  title?: string;
  messages?: string[];
  overlay?: boolean;
  embedded?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const count = messages.length;

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 1600);
    return () => clearInterval(t);
  }, [count]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-6 bg-page px-6 text-center ${
        overlay ? "fixed inset-0 z-[60] animate-fade-in" : embedded ? "min-h-[calc(100dvh-73px)]" : "min-h-dvh"
      }`}
    >
      <LogoLoader size={160} />
      <div className="grid gap-2">
        <p className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.01em] text-ink md:text-[36px]">{title}</p>
        <p key={index} className="animate-fade-up text-[17px] text-slate-500 md:text-[19px]">
          {messages[index % count]}
        </p>
      </div>
      <span className="loading-bar h-1.5 w-48 overflow-hidden rounded-full bg-mist" aria-hidden>
        <span className="block h-full w-1/3 rounded-full bg-billet" />
      </span>
    </div>
  );
}
