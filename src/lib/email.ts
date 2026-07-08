import { supabaseConfig } from "@/src/config";

export interface BundleLinkEmail {
  to: string;
  bundleId: string;
  link: string;
}

/**
 * Send the "here is your saved bundle" email.
 *
 * STUB: no transactional email provider is wired yet, so we only log the message
 * server-side and return the link. Swap the body of this function for a real
 * provider (Resend, Postmark, a Supabase Edge Function, …) when ready — nothing
 * else in the app needs to change.
 */
export async function sendBundleLinkEmail(to: string, bundleId: string): Promise<BundleLinkEmail> {
  const link = `${supabaseConfig.siteUrl.replace(/\/$/, "")}/${bundleId}/bundle`;

  console.log(
    `[email:stub] Bundle link for ${to} → ${link}\n` +
      `(No email provider configured yet — this link would be sent by email.)`
  );

  return { to, bundleId, link };
}
