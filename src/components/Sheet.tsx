"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "@/src/components/ui";

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "drawer" | "modal";
}

export function Sheet({ open, title, onClose, children, footer, variant = "drawer" }: SheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const panel =
    variant === "modal"
      ? "md:m-auto md:max-h-[85dvh] md:w-[460px] md:rounded-3xl md:animate-fade-up"
      : "md:ml-auto md:h-full md:max-h-none md:w-[460px] md:rounded-none md:rounded-l-3xl md:animate-slide-in";

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-stretch" role="dialog" aria-modal="true" aria-label={title}>
      <div onClick={onClose} className="absolute inset-0 bg-nuit/45 animate-fade-in" />
      <div
        className={`relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-page shadow-[0_-12px_48px_-12px_rgba(22,21,58,0.4)] animate-sheet-up ${panel}`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line md:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-3 md:pt-5">
          <h2 className="font-display text-[21px] font-extrabold leading-tight text-ink">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-line transition-colors hover:bg-mist"
          >
            <IconClose size={16} />
          </button>
        </div>
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line bg-white px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
