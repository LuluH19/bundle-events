"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";
import { LoginModal } from "@/src/components/LoginModal";

function IconUser({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function AccountMenu() {
  const user = useCurrentUser();
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (user === undefined) return <div className="ml-auto h-10 w-28" aria-hidden />;

  const buttonClass =
    "flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-mist";

  if (!user) {
    return (
      <>
        <button type="button" onClick={() => setLoginOpen(true)} className={`ml-auto ${buttonClass}`}>
          <IconUser /> Se connecter
        </button>
        {/* The header's backdrop-blur would otherwise contain the fixed overlay. */}
        {loginOpen && createPortal(<LoginModal onClose={() => setLoginOpen(false)} />, document.body)}
      </>
    );
  }

  return (
    <div ref={containerRef} className="relative ml-auto">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Connecté : ${user.email ?? "mon compte"}`}
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-white p-1 ring-1 ring-line transition-colors hover:bg-mist md:pr-4"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-billet text-[14px] font-bold uppercase text-white">
          {user.email?.[0] ?? <IconUser />}
        </span>
        {user.email && (
          <span className="hidden max-w-[16rem] truncate text-[14px] font-semibold text-ink md:block">{user.email}</span>
        )}
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-2xl bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(0,17,58,0.25)] ring-1 ring-line"
        >
          {user.email && (
            <p className="px-3 py-2 text-[12px] text-slate-500">
              Connecté en tant que
              <span className="block truncate font-semibold text-ink">{user.email}</span>
            </p>
          )}
          <Link
            href="/#mes-bundles"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="block rounded-xl px-3 py-2 text-[14px] font-semibold text-ink hover:bg-mist"
          >
            Mes bundles
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="block w-full rounded-xl px-3 py-2 text-left text-[14px] font-semibold text-ink hover:bg-mist"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
