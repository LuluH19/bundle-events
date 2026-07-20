import type { BundleSnapshot, BundleRecord } from "@/src/types";

// Create a bundle from the current composition and return its public uuid.
export async function createBundle(data: BundleSnapshot): Promise<string> {
  const res = await fetch("/api/bundles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`createBundle failed: ${res.status}`);
  const json = (await res.json()) as { uuid: string };
  return json.uuid;
}

// Persist the latest composition snapshot for an existing bundle.
export async function updateBundle(uuid: string, data: BundleSnapshot): Promise<void> {
  const res = await fetch(`/api/bundles/${uuid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`updateBundle failed: ${res.status}`);
}

// Fetch a saved bundle by uuid. Returns null when it does not exist.
export async function fetchBundle(uuid: string): Promise<BundleRecord | null> {
  const res = await fetch(`/api/bundles/${uuid}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetchBundle failed: ${res.status}`);
  return (await res.json()) as BundleRecord;
}

export async function saveBundleEmail(
  uuid: string,
  email: string
): Promise<{ ok: boolean; link: string; sent: boolean }> {
  const res = await fetch(`/api/bundles/${uuid}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `saveBundleEmail failed: ${res.status}`);
  }
  return json as { ok: boolean; link: string; sent: boolean };
}
