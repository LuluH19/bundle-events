import type { GroupSession, TravelGroup } from "@/src/types";

const sessionKey = (bundleUuid: string) => `bundle-events:group:${bundleUuid}`;

export function loadGroupSession(bundleUuid: string): GroupSession | null {
  try {
    const raw = window.localStorage.getItem(sessionKey(bundleUuid));
    return raw ? (JSON.parse(raw) as GroupSession) : null;
  } catch {
    return null;
  }
}

export function saveGroupSession(session: GroupSession): void {
  window.localStorage.setItem(sessionKey(session.bundleUuid), JSON.stringify(session));
}

async function jsonOrThrow<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Une erreur est survenue.");
  return json as T;
}

export async function createGroup(input: {
  bundleUuid: string; groupName: string; organizerName: string; organizerEmail?: string;
}): Promise<{ group: TravelGroup; session: GroupSession }> {
  return jsonOrThrow(await fetch("/api/groups", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  }));
}

export async function fetchGroup(session: GroupSession): Promise<TravelGroup> {
  const result = await jsonOrThrow<{ group: TravelGroup }>(await fetch(`/api/groups/${session.groupId}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store",
  }));
  return result.group;
}

export async function inviteToGroup(session: GroupSession, email?: string) {
  return jsonOrThrow<{ link: string; duplicate: boolean; sent: boolean }>(await fetch(`/api/groups/${session.groupId}/invitations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email || undefined }),
  }));
}

export async function joinGroup(input: { token: string; name: string; email?: string }) {
  return jsonOrThrow<{ group: TravelGroup; session: GroupSession }>(await fetch("/api/groups/join", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  }));
}
