"use client";

import { useEffect, useState } from "react";
import { saveBundleEmail } from "@/src/services/bundles";
import { Button, IconCheck, IconClose } from "@/src/components/ui";

interface SaveBundleModalProps {
  bundleId: string;
  onClose: () => void;
}

type Status = "idle" | "sending" | "sent" | "error";

// Mounted only while open (see BundleView), so state always starts fresh.
export function SaveBundleModal({ bundleId, onClose }: SaveBundleModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await saveBundleEmail(bundleId, email.trim());
      setLink(res.link);
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[1.75rem] bg-white p-8 shadow-2xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 transition-colors hover:text-ink"
          aria-label="Fermer"
        >
          <IconClose size={20} />
        </button>

        {status === "sent" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-soft text-ember-ink">
              <IconCheck size={28} />
            </span>
            <h2 className="font-display text-[24px] font-extrabold text-ink">Bundle sauvegardé&nbsp;!</h2>
            <p className="text-[14px] text-slate-500">
              Un email avec le lien vers votre bundle a été envoyé à <strong>{email}</strong>.
            </p>
            <a
              href={link}
              className="w-full truncate rounded-xl bg-mist px-4 py-3 text-[13px] font-medium text-navy-500 ring-1 ring-line"
            >
              {link}
            </a>
            <Button kind="dark" onClick={onClose} className="mt-2 w-full">
              Fermer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <h2 className="font-display text-[26px] font-extrabold leading-tight text-ink">
                Sauvegarder mon bundle
              </h2>
              <p className="text-[14px] text-slate-500">
                Entrez votre adresse email : nous vous envoyons le lien pour retrouver ce bundle quand vous voulez.
              </p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="eyebrow text-slate-400">Adresse email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] text-ink outline-none transition-colors focus:border-ember"
              />
            </label>

            {status === "error" && <p className="text-[13px] font-medium text-red-500">{error}</p>}

            <Button
              type="submit"
              kind="primary"
              disabled={status === "sending"}
              className="w-full"
            >
              {status === "sending" ? "Envoi en cours…" : "Recevoir mon lien par email"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
