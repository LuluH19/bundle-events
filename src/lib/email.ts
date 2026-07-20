import { supabaseConfig } from "@/src/config";

export interface BundleLinkEmail {
  to: string;
  bundleId: string;
  link: string;
  sent: boolean;
}

export async function sendBundleLinkEmail(to: string, bundleId: string): Promise<BundleLinkEmail> {
  const link = `${supabaseConfig.siteUrl.replace(/\/$/, "")}/${bundleId}/bundle`;
  const subject = "Votre bundle BundleEvent est sauvegardé";
  const html = bundleEmailHtml(link);
  const from = parseFrom();

  let sent = false;
  if (process.env.BREVO_API_KEY) {
    sent = await sendViaBrevo(to, subject, html, from);
  } else {
    console.log(
      `[email:stub] Bundle link for ${to} → ${link}\n` +
        `(Set BREVO_API_KEY + EMAIL_FROM to send this by email.)`
    );
  }

  return { to, bundleId, link, sent };
}

interface Sender {
  name: string;
  email: string;
}

function parseFrom(): Sender {
  const raw = (process.env.EMAIL_FROM || "no-reply@bundle-events.app")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || "BundleEvent", email: m[2].trim() };
  return { name: process.env.EMAIL_FROM_NAME || "BundleEvent", email: raw };
}

export function emailConfig() {
  return { brevoConfigured: !!process.env.BREVO_API_KEY, from: parseFrom() };
}

export async function sendTestEmail(to: string): Promise<{ ok: boolean; status: number; body: string }> {
  if (!process.env.BREVO_API_KEY) return { ok: false, status: 0, body: "BREVO_API_KEY not set" };
  const from = parseFrom();
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: from,
      to: [{ email: to }],
      subject: "BundleEvent — health-check",
      htmlContent: "<p>health-check</p>",
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function sendViaBrevo(to: string, subject: string, html: string, from: Sender): Promise<boolean> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ sender: from, to: [{ email: to }], subject, htmlContent: html }),
    });
    if (!res.ok) {
      console.error(`[email] Brevo refused (${res.status}): ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Brevo request failed:", err);
    return false;
  }
}

function bundleEmailHtml(link: string): string {
  const font = "'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif";
  return `
<div style="margin:0;padding:32px 16px;background:#f9f9fb;font-family:${font};-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;border-collapse:separate;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden">

        <tr><td bgcolor="#00113a" style="background:#00113a;padding:44px 44px 40px">
          <span style="display:inline-block;background:#ffdbcb;color:#9f4200;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:6px 12px;border-radius:9999px">Bundle sauvegardé</span>
          <h1 style="margin:20px 0 0;font-size:36px;line-height:1.02;font-weight:800;letter-spacing:-0.02em;color:#ffffff">
            Votre escapade,<br><span style="color:#f96c1a">assemblée.</span>
          </h1>
        </td></tr>

        <tr><td bgcolor="#f96c1a" style="background:#f96c1a;height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>

        <tr><td style="padding:36px 44px 40px">
          <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#475569">
            Bonne nouvelle&nbsp;: votre bundle est prêt et sauvegardé. Retrouvez tous vos trajets et votre hébergement quand vous voulez, sur n'importe quel appareil, avec ce lien&nbsp;:
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <tr><td bgcolor="#f96c1a" style="border-radius:9999px">
              <a href="${link}" target="_blank" style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9999px">
                Voir mon bundle&nbsp;&rarr;
              </a>
            </td></tr>
          </table>

          <p style="margin:26px 0 0;font-size:13px;line-height:1.5;color:#94a3b8">
            Ou copiez ce lien&nbsp;:<br>
            <a href="${link}" target="_blank" style="color:#9f4200;word-break:break-all;text-decoration:none">${link}</a>
          </p>
        </td></tr>

        <tr><td style="padding:22px 44px 30px;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8">
            <strong style="color:#00113a">Bundle&nbsp;Events</strong> — vos escapades événementielles, assemblées en un lien.<br>
            Vous recevez cet email car ce lien a été demandé depuis Bundle&nbsp;Events.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>`;
}
