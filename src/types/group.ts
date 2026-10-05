export type GroupRole = "organizer" | "member";

export interface GroupMember {
  id: string;
  name: string;
  email: string | null;
  role: GroupRole;
  joinedAt: string;
  shareCents: number | null;
}

export interface TravelGroup {
  id: string;
  bundleUuid: string;
  name: string;
  members: GroupMember[];
  pendingInvitations: string[];
  currentMemberRole: GroupRole;
}

export interface GroupSession {
  groupId: string;
  bundleUuid: string;
  accessToken: string;
}
