"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { signInWithEmail } from "@/src/services/account";
import { Button, IconCheck, IconClose } from "@/src/components/ui";

interface LoginModalProps {
  onClose: () => void;
}

type Status = "idle" | "sending" | "sent" | "error";

export function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

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
      await signInWithEmail(email.trim().toLowerCase());
      posthog.capture("login_link_requested");
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
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

        <div className="space-y-2">
          <h2 id="login-title" className="font-display text-[26px] font-extrabold leading-tight text-ink">
            Retrouve tous tes voyages
          </h2>
          <p className="text-[14px] text-slate-500">
            Connecte-toi pour garder tes bundles dans ton espace. Pas de mot de passe : on t&apos;envoie un lien de connexion.
          </p>
        </div>

        {status === "sent" ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-ember-soft/60 p-4">
            <IconCheck size={18} className="mt-0.5 shrink-0 text-ember-ink" />
            <p className="text-[13px] text-ember-ink">
              Vérifie ta boîte mail : un lien de connexion a été envoyé à <strong>{email}</strong>. Pense à regarder tes spams.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="eyebrow text-slate-500">Adresse e-mail</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
                className="rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] text-ink outline-none transition-colors focus:border-ember"
              />
            </label>

            {status === "error" && <p className="text-[13px] font-medium text-red-500">{error}</p>}

            <Button type="submit" kind="primary" disabled={status === "sending"} className="w-full">
              {status === "sending" ? "Envoi en cours…" : "Recevoir mon lien de connexion"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
