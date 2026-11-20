"use client";

import type { PriceQuote, RouteOption } from "@/src/types";

function amountLabel(quote: PriceQuote): string {
  if (quote.source === "tariff" && quote.max != null && quote.max > quote.amount) {
    return `de ${quote.amount} à ${quote.max} €`;
  }
  if (quote.source === "estimate") return `≈ ${quote.amount} €`;
  return `${quote.amount} €`;
}

function caption(quote: PriceQuote): string {
  if (quote.source === "live") {
    if (quote.provider?.includes(" + ")) return `Prix du jour (${quote.provider})`;
    if (quote.provider === "Trainline") return "Prix Trainline du jour";
    if (quote.provider === "FlixBus") return "Prix FlixBus du jour";
    if (quote.provider === "Aviasales" || quote.provider === "Kayak") return "Prix Kayak / Aviasales";
    if (quote.provider) return `Prix ${quote.provider} du jour`;
    return "Prix du jour";
  }
  if (quote.source === "tariff") return "Tarif officiel SNCF";
  if (quote.provider === "carburant + péages") return "Coût estimé (carburant + péages)";
  if (quote.provider?.includes("Trainline") || quote.provider?.includes("Aviasales") || quote.provider?.includes("FlixBus")) {
    return `Prix partiel (${quote.provider}) · reste estimé`;
  }
  return "Prix estimé";
}

interface PriceTagProps {
  option: RouteOption;
  loading?: boolean;
  /** Larger display used on trip / book cards. */
  size?: "sm" | "lg";
  className?: string;
  captionClassName?: string;
}

export function PriceTag({ option, loading, size = "sm", className = "", captionClassName = "" }: PriceTagProps) {
  const quote = option.quote;
  const amountClass = size === "lg" ? "font-display text-[22px] font-extrabold text-ink" : "font-display text-[20px] font-extrabold text-ink";

  if (loading && !quote) {
    return (
      <span className={`grid justify-items-end gap-1 ${className}`}>
        <span className={`${size === "lg" ? "h-7 w-20" : "h-6 w-16"} animate-pulse rounded bg-mist`} />
        <span className="h-3 w-24 animate-pulse rounded bg-mist" />
      </span>
    );
  }

  const display: PriceQuote = quote ?? { amount: option.price, source: "estimate" };

  return (
    <span className={`grid justify-items-end gap-0.5 ${className}`}>
      <span className={amountClass}>{amountLabel(display)}</span>
      <span className={`text-[12px] text-slate-500 ${captionClassName}`}>{caption(display)}</span>
    </span>
  );
}
