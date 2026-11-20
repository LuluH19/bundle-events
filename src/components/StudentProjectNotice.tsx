"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "@/src/components/Sheet";
import { IconExternal } from "@/src/components/ui";

const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeOYVL_06Yi1nsKvNN-3v454WI5uEMQR1GlkihjGt3xfNFoyg/viewform";

const noopSubscribe = () => () => {};

export function StudentProjectNotice() {
  const [open, setOpen] = useState(false);
  // false during SSR and hydration, true on the client: the portal needs document.body.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto inline-flex shrink-0 items-center rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-page"
      >
        Projet étudiant
      </button>
      {mounted &&
        createPortal(
          <Sheet open={open} title="Projet étudiant" onClose={() => setOpen(false)} variant="modal">
            <div className="space-y-3 text-[15px] leading-relaxed text-slate-500">
              <p>Bundle Events est un projet étudiant. Les billets et les chambres se réservent chez les transporteurs et les hôtels.</p>
              <p>5 questions, environ 2 minutes : ton avis nous aide à améliorer l’app.</p>
            </div>
            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-navy-700"
            >
              Donner mon avis
              <IconExternal size={16} />
            </a>
          </Sheet>,
          document.body,
        )}
    </>
  );
}
