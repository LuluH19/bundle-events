"use client";

import { useEffect, useState } from "react";
import { saveBundleEmail } from "@/src/services/bundles";
import { Button, IconCheck, IconClose, IconCopy, IconShare } from "@/src/components/ui";

interface SaveBundleModalProps {
  bundleId: string;
  onClose: () => void;
}

type Status = "idle" | "sending" | "sent" | "error";

export function SaveBundleModal({ bundleId, onClose }: SaveBundleModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const [origin, setOrigin] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  const link = origin ? `${origin}/${bundleId}/bundle` : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* empty */
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: "Mon bundle BundleEvent", url: link });
    } catch {
      /* empty */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await saveBundleEmail(bundleId, email.trim());
      setSent(res.sent);
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

        <div className="space-y-2">
          <h2 className="font-display text-[26px] font-extrabold leading-tight text-ink">Sauvegarder mon bundle</h2>
          <p className="text-[14px] text-slate-500">
            Gardez ce lien pour retrouver votre bundle à tout moment, sur n&apos;importe quel appareil.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl bg-mist p-2 pl-4 ring-1 ring-line">
          <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-navy-500">
            {link || "Génération du lien…"}
          </span>
          <button
            type="button"
            onClick={copy}
            disabled={!link}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-40"
          >
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {canShare && (
            <button
              type="button"
              onClick={share}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-mist"
            >
              <IconShare size={14} /> Partager
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-mist"
          >
            {showQr ? "Masquer le QR" : "QR code"}
          </button>
        </div>

        {showQr && link && (
          <div className="mt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(link)}`}
              alt="QR code du bundle"
              width={180}
              height={180}
              className="rounded-xl ring-1 ring-line"
            />
          </div>
        )}

        <div className="my-6 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-widest text-slate-300">
          <span className="h-px flex-1 bg-line" /> ou par email <span className="h-px flex-1 bg-line" />
        </div>

        {status === "sent" ? (
          <div className="flex items-start gap-3 rounded-xl bg-ember-soft/60 p-4">
            <IconCheck size={18} className="mt-0.5 shrink-0 text-ember-ink" />
            <p className="text-[13px] text-ember-ink">
              {sent ? (
                <>
                  Email envoyé à <strong>{email}</strong>. Pensez à vérifier vos spams.
                </>
              ) : (
                <>Votre email est enregistré. En attendant, utilisez le lien ci-dessus pour retrouver votre bundle.</>
              )}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="eyebrow text-slate-400">Adresse email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] text-ink outline-none transition-colors focus:border-ember"
              />
            </label>

            {status === "error" && <p className="text-[13px] font-medium text-red-500">{error}</p>}

            <Button type="submit" kind="primary" disabled={status === "sending"} className="w-full">
              {status === "sending" ? "Envoi en cours…" : "Recevoir le lien par email"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
