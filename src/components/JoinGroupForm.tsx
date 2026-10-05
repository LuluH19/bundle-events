"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinGroup, saveGroupSession } from "@/src/services/groups";

export function JoinGroupForm({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await joinGroup({ token, name, email });
      saveGroupSession(result.session);
      router.replace(`/${result.session.bundleUuid}/bundle`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de rejoindre le groupe."); setBusy(false);
    }
  }
  return <main className="flex min-h-screen items-center justify-center bg-mist px-5"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-4xl bg-white p-8 shadow-xl ring-1 ring-line"><div><p className="eyebrow text-ember">Invitation</p><h1 className="mt-2 font-display text-3xl font-extrabold text-ink">Rejoindre le groupe</h1><p className="mt-2 text-sm text-slate-500">Présentez-vous pour accéder au bundle partagé.</p></div><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom" className="w-full rounded-xl border border-line px-4 py-3" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre email" className="w-full rounded-xl border border-line px-4 py-3" />{error && <p className="text-sm text-red-600">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-ember px-5 py-3.5 font-bold text-white disabled:opacity-50">{busy ? "Connexion…" : "Rejoindre"}</button></form></main>;
}
