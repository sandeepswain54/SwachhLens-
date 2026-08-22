// Compute layer for the Users page: merges `profiles` (every signed-up
// account) with `teams` (the subset of those accounts that are field-team
// logins) into one user list, plus the stat cards / charts / activity feed
// built from it. There's no separate "Municipal Staff" table or role system
// in this project (see admin_panel/README.md's "No admin roles" limitation)
// — every real account here is either a citizen (self-signup via the mobile
// app) or a field team (created by an admin via Teams & Assignments), so
// those are the only two user types this page shows.

import type { ProfileActivityEvent } from '@/contexts/ProfilesContext';
import type { TeamActivityEvent } from '@/contexts/TeamsContext';
import { deriveLocality } from './complaints';
import type { AuthMeta, ProfileRow } from './profiles';
import type { ReportRow } from './reports';
import type { TeamRow } from './teams';

export type UserType = 'citizen' | 'field_team';
export type UserStatus = 'active' | 'blocked';

export type AppUser = {
  id: string;
  displayId: string;
  fullName: string;
  email: string | null;
  userType: UserType;
  role: string;
  zone: string | null;
  teamCode: string | null;
  status: UserStatus;
  joinedAt: string;
  blockedAt: string | null;
  lastSignInAt: string | null;
  reportCount: number;
};

// A profile's own address history (its most recent submitted report) is the
// only real signal a citizen has for "Zone/Area" — there's no dedicated
// zone/location field on profiles itself.
function citizenZone(userId: string, reports: ReportRow[]): string | null {
  const own = reports.filter((r) => r.user_id === userId);
  if (own.length === 0) return null;
  const latest = own.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b));
  return deriveLocality(latest.address);
}

export function buildUserRows(
  profiles: ProfileRow[],
  teams: TeamRow[],
  reports: ReportRow[],
  authMeta: AuthMeta[]
): AppUser[] {
  const teamByAuthId = new Map(teams.filter((t) => t.auth_user_id).map((t) => [t.auth_user_id as string, t]));
  const authMetaById = new Map(authMeta.map((m) => [m.id, m]));
  const reportCountByUser = new Map<string, number>();
  for (const r of reports) reportCountByUser.set(r.user_id, (reportCountByUser.get(r.user_id) ?? 0) + 1);

  // Display IDs are a stable, deterministic label derived from real join
  // order (oldest account = U-1001) — the same kind of derived-not-fabricated
  // id as HotspotCluster's `HS-1001` or the DB's own `TEAM-01` sequence.
  // Raw Supabase UUIDs are the real identity used for every action.
  const byJoinOrder = [...profiles].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const displayIdById = new Map(byJoinOrder.map((p, i) => [p.id, `U-${1001 + i}`]));

  const users: AppUser[] = profiles.map((p) => {
    const team = teamByAuthId.get(p.id) ?? null;
    const meta = authMetaById.get(p.id);
    return {
      id: p.id,
      displayId: displayIdById.get(p.id) ?? p.id.slice(0, 8),
      fullName: p.full_name,
      email: p.email,
      userType: team ? 'field_team' : 'citizen',
      role: team ? 'Team Leader' : 'Citizen User',
      zone: team ? team.zone : citizenZone(p.id, reports),
      teamCode: team?.team_code ?? null,
      status: p.is_blocked ? 'blocked' : 'active',
      joinedAt: team?.created_at ?? p.created_at,
      blockedAt: p.blocked_at,
      lastSignInAt: meta?.lastSignInAt ?? null,
      reportCount: reportCountByUser.get(p.id) ?? 0,
    };
  });

  return users.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
}

export type WeekDelta = { value: number; deltaPercent: number | null };

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100;
  return ((curr - prev) / prev) * 100;
}

function snapshotAt(users: AppUser[], cutoffMs: number) {
  const existing = users.filter((u) => new Date(u.joinedAt).getTime() <= cutoffMs);
  const citizen = existing.filter((u) => u.userType === 'citizen').length;
  const fieldTeam = existing.filter((u) => u.userType === 'field_team').length;
  const blocked = existing.filter((u) => u.blockedAt && new Date(u.blockedAt).getTime() <= cutoffMs).length;
  return { total: existing.length, citizen, fieldTeam, blocked };
}

export type UserWeekOverWeek = { total: WeekDelta; citizen: WeekDelta; fieldTeam: WeekDelta; blocked: WeekDelta };

export function computeUserWeekOverWeek(users: AppUser[]): UserWeekOverWeek {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const current = snapshotAt(users, now);
  const previous = snapshotAt(users, weekAgo);

  return {
    total: { value: current.total, deltaPercent: pctDelta(current.total, previous.total) },
    citizen: { value: current.citizen, deltaPercent: pctDelta(current.citizen, previous.citizen) },
    fieldTeam: { value: current.fieldTeam, deltaPercent: pctDelta(current.fieldTeam, previous.fieldTeam) },
    blocked: { value: current.blocked, deltaPercent: pctDelta(current.blocked, previous.blocked) },
  };
}

export type UserDistributionSlice = { name: string; count: number; percent: number; color: string };

export function computeUserTypeDistribution(users: AppUser[]): UserDistributionSlice[] {
  const total = users.length;
  const citizen = users.filter((u) => u.userType === 'citizen').length;
  const fieldTeam = total - citizen;
  return [
    { name: 'Citizen Users', count: citizen, percent: total > 0 ? (citizen / total) * 100 : 0, color: '#2a78d6' },
    { name: 'Field Team Users', count: fieldTeam, percent: total > 0 ? (fieldTeam / total) * 100 : 0, color: '#eb6834' },
  ];
}

export type StatusBar = { label: string; count: number; color: string };

export function computeUsersByStatusBars(users: AppUser[]): StatusBar[] {
  const active = users.filter((u) => u.status === 'active').length;
  const blocked = users.length - active;
  return [
    { label: 'Active', count: active, color: '#1baf7a' },
    { label: 'Blocked', count: blocked, color: '#d03b3b' },
  ];
}

export type UserTypeOverviewRow = { label: string; count: number; percent: number };

export function computeUserTypeOverview(users: AppUser[]): UserTypeOverviewRow[] {
  const total = users.length;
  const citizen = users.filter((u) => u.userType === 'citizen').length;
  const fieldTeam = total - citizen;
  const blocked = users.filter((u) => u.status === 'blocked').length;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return [
    { label: 'Citizen Users', count: citizen, percent: pct(citizen) },
    { label: 'Field Team Users', count: fieldTeam, percent: pct(fieldTeam) },
    { label: 'Blocked Users', count: blocked, percent: pct(blocked) },
  ];
}

export type UserActivityItem = {
  id: string;
  activity: string;
  userName: string;
  userType: UserType | null;
  details: string;
  at: string;
};

// Merges every real signal this schema actually has into one feed:
// - "Complaint Submitted" — real, all-time (reports.created_at never
//   changes), not limited to the current session.
// - New registrations / block / unblock — session-only, same honest
//   limitation as the Dashboard/Teams "Recent Activity" panels (see
//   ProfilesContext).
// - Team on/off-duty changes — reuses TeamsContext's own session activity
//   feed rather than re-deriving it.
export function computeRecentUserActivity(
  profileActivity: ProfileActivityEvent[],
  teamActivity: TeamActivityEvent[],
  reports: ReportRow[],
  profiles: ProfileRow[],
  limit = 8
): UserActivityItem[] {
  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const items: UserActivityItem[] = [];

  for (const e of profileActivity) {
    items.push({
      id: e.key,
      activity: e.kind === 'new_user' ? 'New User Registered' : e.kind === 'blocked' ? 'User Blocked' : 'User Unblocked',
      userName: e.profile.full_name,
      userType: null,
      details:
        e.kind === 'new_user'
          ? 'Account registered'
          : e.kind === 'blocked'
            ? 'Sign-in disabled by admin'
            : 'Sign-in re-enabled by admin',
      at: e.at,
    });
  }

  for (const e of teamActivity) {
    items.push({ id: e.key, activity: 'Team Status Changed', userName: e.text, userType: 'field_team', details: e.text, at: e.at });
  }

  for (const r of reports.slice(0, 60)) {
    items.push({
      id: `report-${r.id}`,
      activity: 'Complaint Submitted',
      userName: nameById.get(r.user_id) ?? 'SwachhLens User',
      userType: 'citizen',
      details: `New complaint #${r.report_code} submitted`,
      at: r.created_at,
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
