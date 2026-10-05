"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { GroupMemberPayment } from "@/src/types";
import { paymentSummary, setMemberPaymentStatus } from "@/src/utils/payments";
import { sendPaymentReminders } from "@/src/services/bundles";

type Props = {
  members: GroupMemberPayment[];
  onChange: (members: GroupMemberPayment[]) => void;
  bundleId?: string;
};

export function PaymentDashboard({ members, onChange, bundleId }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const summary = useMemo(() => paymentSummary(members), [members]);
  const [reminderState, setReminderState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [reminderMessage, setReminderMessage] = useState("");

  const addMember = (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!name.trim() || !email.trim() || !Number.isFinite(parsedAmount) || parsedAmount < 0) return;
    onChange([
      ...members,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        amount: parsedAmount,
        status: "unpaid",
        paidAt: null,
      },
    ]);
    setName("");
    setEmail("");
    setAmount("");
  };

  const remindUnpaid = async () => {
    if (!bundleId || summary.unpaidCount === 0 || reminderState === "sending") return;
    setReminderState("sending");
    try {
      const result = await sendPaymentReminders(bundleId);
      setReminderMessage(
        result.deliveryConfigured
          ? `${result.sent} rappel${result.sent > 1 ? "s" : ""} envoyé${result.sent > 1 ? "s" : ""}.`
          : `${result.targeted} rappel${result.targeted > 1 ? "s" : ""} préparé${result.targeted > 1 ? "s" : ""} (Brevo non configuré).`
      );
      setReminderState("done");
    } catch {
      setReminderMessage("L'envoi des rappels a échoué. Réessayez.");
      setReminderState("error");
    }
  };

  return (
    <section className="col-span-12 rounded-4xl bg-white p-7 shadow-[0_18px_48px_-24px_rgba(0,17,58,0.35)] ring-1 ring-line md:p-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow text-ember">Paiements du groupe</p>
          <h2 className="mt-2 font-display text-[28px] font-extrabold text-ink">Qui a réglé sa part ?</h2>
          <p className="mt-2 text-[14px] text-slate-500">Ce tableau est réservé aux personnes disposant du lien privé du bundle.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat value={`${summary.paidCount}/${members.length}`} label="Payés" />
          <Stat value={String(summary.unpaidCount)} label="À relancer" />
          <Stat value={`${summary.paidAmount.toLocaleString("fr-FR")} €`} label={`sur ${summary.totalAmount.toLocaleString("fr-FR")} €`} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={remindUnpaid} disabled={!bundleId || summary.unpaidCount === 0 || reminderState === "sending"} className="rounded-xl bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-600 disabled:cursor-not-allowed disabled:opacity-45">
          {reminderState === "sending" ? "Envoi en cours…" : `Relancer les impayés (${summary.unpaidCount})`}
        </button>
        {reminderMessage && <p role="status" className={`text-sm ${reminderState === "error" ? "text-red-600" : "text-slate-500"}`}>{reminderMessage}</p>}
      </div>

      <form onSubmit={addMember} className="mt-8 grid gap-3 rounded-2xl bg-mist p-4 md:grid-cols-[1fr_1.2fr_140px_auto]">
        <input aria-label="Nom du membre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" required className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ember" />
        <input aria-label="Email du membre" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.fr" required className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ember" />
        <input aria-label="Montant de la part" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Part (€)" required className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ember" />
        <button type="submit" className="rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-700">Ajouter</button>
      </form>

      <div className="mt-6 space-y-3">
        {members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-slate-400">Ajoutez les membres du groupe pour suivre leurs paiements.</p>
        ) : members.map((member) => (
          <div key={member.id} className="flex flex-col gap-4 rounded-2xl border border-line p-4 sm:flex-row sm:items-center">
            <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${member.status === "paid" ? "bg-emerald-500" : "bg-amber-400"}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{member.name}</p>
              <p className="truncate text-xs text-slate-400">{member.email}</p>
            </div>
            <p className="font-display text-lg font-extrabold text-ink">{member.amount.toLocaleString("fr-FR")} €</p>
            <span className={`w-24 text-sm font-bold ${member.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>{member.status === "paid" ? "Payé" : "Non payé"}</span>
            <button type="button" onClick={() => onChange(setMemberPaymentStatus(members, member.id, member.status !== "paid"))} className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-mist">
              {member.status === "paid" ? "Annuler" : "Marquer payé"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="min-w-20 rounded-2xl bg-mist px-3 py-3"><p className="font-display text-xl font-extrabold text-ink">{value}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div>;
}
