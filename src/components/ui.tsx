"use client";

import type { TransportMode, IconProps, EyebrowProps, ChipProps, ButtonProps } from "@/src/types";

/* ─────────────────────────────────────────────────────────────
   Icons — stroke-based, inherit currentColor.
   ───────────────────────────────────────────────────────────── */


const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
});

export function IconArrow({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
export function IconPin({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
export function IconTrain({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="5" y="3" width="14" height="13" rx="3" />
      <path d="M5 11h14M9 16l-2 4M15 16l2 4" />
      <circle cx="9" cy="13.5" r="0.6" fill="currentColor" />
      <circle cx="15" cy="13.5" r="0.6" fill="currentColor" />
    </svg>
  );
}
export function IconPlane({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10.5 13.5 3 12l1-2 7 1 4.5-6c.7-.9 2.6-1.2 3 .2.3 1 .1 1.7-.6 2.4L13 13l-1 7-2 .8-1.3-6.5Z" />
    </svg>
  );
}
export function IconCar({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <path d="M4 11h16v6H4zM7 17v2M17 17v2" />
      <circle cx="7.5" cy="14" r="0.8" fill="currentColor" />
      <circle cx="16.5" cy="14" r="0.8" fill="currentColor" />
    </svg>
  );
}
export function IconBus({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M4 11h16M8 17v2M16 17v2" />
      <circle cx="8" cy="14" r="0.8" fill="currentColor" />
      <circle cx="16" cy="14" r="0.8" fill="currentColor" />
    </svg>
  );
}
export function IconWalk({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="13" cy="4.5" r="1.6" />
      <path d="M13 8l-3 3 1 4-2 4M13 8l3 2 3 1M10 11l-2 1" />
    </svg>
  );
}
export function IconStar({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.1 20.9l1.1-6.5L2.5 9.3l6.5-.9L12 2.5Z" />
    </svg>
  );
}
export function IconLeaf({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 20c0-8 6-14 16-14 0 10-6 14-16 14Z" />
      <path d="M4 20c2-5 5-8 9-10" />
    </svg>
  );
}
export function IconWifi({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8 15.5a5 5 0 0 1 8 0" />
      <circle cx="12" cy="19" r="0.8" fill="currentColor" />
    </svg>
  );
}
export function IconCheck({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}
export function IconClose({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
export function IconSearch({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
export function IconMap({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14" />
    </svg>
  );
}
export function IconBed({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 18v-7h13a4 4 0 0 1 4 4v3" />
      <path d="M3 14h17M3 9V6M3 18v2M20 18v2" />
      <path d="M7 11V9.5A1.5 1.5 0 0 1 8.5 8h2A1.5 1.5 0 0 1 12 9.5V11" />
    </svg>
  );
}
export function IconBag({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
export function IconSparkle({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  );
}
export function IconTicket({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a2 2 0 1 0 0 5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5a2 2 0 1 0 0-5V8Z" />
      <path d="M14 6.5v11" strokeDasharray="2 2.5" />
    </svg>
  );
}

export const MODE_ICON: Record<TransportMode, (p: IconProps) => React.ReactElement> = {
  train: IconTrain,
  plane: IconPlane,
  car: IconCar,
  bus: IconBus,
  walking: IconWalk,
};

/* ─────────────────────────────────────────────────────────────
   Small UI primitives
   ───────────────────────────────────────────────────────────── */
export function Eyebrow({
  children,
  className = "",
  tone = "ember",
}: EyebrowProps) {
  const color =
    tone === "ember" ? "text-ember-ink" : tone === "navy" ? "text-navy-500" : "text-slate-400";
  return <div className={`eyebrow ${color} ${className}`}>{children}</div>;
}

export function Chip({
  children,
  className = "",
}: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-ember-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ember-ink ${className}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  kind = "primary",
  className = "",
  disabled,
  type = "button",
}: ButtonProps) {
  const styles = {
    primary: "bg-ember text-white hover:bg-ember-600 shadow-[0_12px_28px_-8px_rgba(249,108,26,0.6)]",
    dark: "bg-ink text-white hover:bg-navy-700",
    ghost: "bg-page text-ink ring-1 ring-inset ring-line hover:bg-line",
  }[kind];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
