"use client";

import { useEffect, useState } from "react";
import type { GroupSession, TravelGroup } from "@/src/types";
import { createGroup, fetchGroup, inviteToGroup, loadGroupSession, saveGroupSession, splitGroupTotal } from "@/src/services/groups";
import { IconCheck, IconCopy, IconShare } from "@/src/components/ui";

export function GroupPanel({ bundleUuid, totalCents }: { bundleUuid: string; totalCents: number }) {
  const [session, setSession] = useState<GroupSession | null>(null);
  const [group, setGroup] = useState<TravelGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = loadGroupSession(bundleUuid);
    if (!saved) return;
    setSession(saved);
    fetchGroup(saved).then(setGroup).catch(() => setSession(null));
  }, [bundleUuid]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await createGroup({ bundleUuid, groupName, organizerName: name, organizerEmail });
      saveGroupSession(result.session); setSession(result.session); setGroup(result.group);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  async function handleInvite(email?: string) {
    if (!session) return;
    setBusy(true); setMessage("");
    try {
      const result = await inviteToGroup(session, email);
      if (!email) await navigator.clipboard.writeText(result.link);
      setMessage(result.duplicate
        ? "Invitation déjà envoyée : le lien existant a été conservé."
        : email ? (result.sent ? "Invitation envoyée par email." : "Invitation créée. L’envoi email n’est pas configuré.") : "Lien d’invitation copié.");
      setInviteEmail(""); setGroup(await fetchGroup(session));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  async function handleSplit() {
    if (!session) return;
    setBusy(true); setMessage("");
    try {
      setGroup(await splitGroupTotal(session, totalCents));
      setMessage("Le total a été réparti équitablement, au centime près.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  return (
    <section className="col-span-12 rounded-4xl bg-white p-7 shadow-[0_18px_48px_-24px_rgba(0,17,58,0.35)] ring-1 ring-line md:p-9">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember-soft text-ember"><IconShare size={20} /></span>
        <div><p className="eyebrow text-ember">Voyage en groupe</p><h2 className="font-display text-[24px] font-extrabold text-ink">{group?.name || "Planifiez avec vos amis"}</h2></div>
      </div>
      {!group ? (
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-3">
          <input required value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nom du groupe" className="rounded-xl border border-line px-4 py-3 text-sm" />
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom" className="rounded-xl border border-line px-4 py-3 text-sm" />
          <input type="email" value={organizerEmail} onChange={(e) => setOrganizerEmail(e.target.value)} placeholder="Votre email (facultatif)" className="rounded-xl border border-line px-4 py-3 text-sm" />
          <button disabled={busy} className="rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white disabled:opacity-50 md:col-span-3">Créer le groupe</button>
        </form>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div><p className="mb-3 text-sm font-bold text-ink">{group.members.length} membre{group.members.length > 1 ? "s" : ""}</p><div className="space-y-2">{group.members.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-mist px-4 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-bold text-ember">{member.name[0]?.toUpperCase()}</span><span className="text-sm font-semibold text-ink">{member.name}</span>{member.shareCents !== null && <span className="ml-auto font-display text-sm font-extrabold text-ink">{(member.shareCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>}{member.role === "organizer" && member.shareCents === null && <span className="ml-auto text-xs text-slate-400">Organisateur</span>}</div>)}</div></div>
          {group.currentMemberRole === "organizer" && <div className="space-y-3"><button type="button" disabled={busy} onClick={handleSplit} className="w-full rounded-xl bg-ember px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Diviser équitablement · {(totalCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</button><button type="button" disabled={busy} onClick={() => handleInvite()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-bold text-ink"><IconCopy size={16} /> Copier un lien d’invitation</button><div className="flex gap-2"><input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="ami@exemple.fr" className="min-w-0 flex-1 rounded-xl border border-line px-4 py-3 text-sm" /><button type="button" disabled={busy || !inviteEmail} onClick={() => handleInvite(inviteEmail)} className="rounded-xl bg-ember px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Inviter</button></div>{group.pendingInvitations.length > 0 && <p className="text-xs text-slate-400">En attente : {group.pendingInvitations.join(", ")}</p>}</div>}
        </div>
      )}
      {message && <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><IconCheck size={15} className="text-ember" />{message}</p>}
    </section>
  );
}
