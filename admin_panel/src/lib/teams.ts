import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from './supabase';

export type TeamStatus = 'on_duty' | 'available' | 'maintenance';

export const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  on_duty: 'On Duty',
  available: 'Available',
  maintenance: 'Maintenance',
};

export const ZONES = ['Zone-1', 'Zone-2', 'Zone-3', 'Zone-4', 'Zone-5', 'Zone-6', 'Zone-7', 'Zone-8'] as const;

export type TeamRow = {
  id: string;
  team_code: string;
  team_name: string;
  leader_name: string;
  email: string;
  phone: string | null;
  zone: string;
  status: TeamStatus;
  member_count: number;
  member_capacity: number;
  daily_capacity: number;
  auth_user_id: string | null;
  work_since: string;
  created_at: string;
};

const TEAM_COLUMNS =
  'id, team_code, team_name, leader_name, email, phone, zone, status, member_count, member_capacity, daily_capacity, auth_user_id, work_since, created_at';

export async function getAllTeams(): Promise<TeamRow[]> {
  const { data, error } = await supabase
    .from('teams')
    .select(TEAM_COLUMNS)
    .order('team_code', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TeamRow[];
}

export function subscribeToTeamChanges(handlers: {
  onInsert: (row: TeamRow) => void;
  onUpdate: (row: TeamRow) => void;
}) {
  const channel = supabase
    .channel('admin-team-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'teams' },
      (payload) => handlers.onInsert(payload.new as TeamRow)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'teams' },
      (payload) => handlers.onUpdate(payload.new as TeamRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function updateTeamStatus(teamId: string, status: TeamStatus): Promise<void> {
  const { error } = await supabase.from('teams').update({ status }).eq('id', teamId);
  if (error) throw new Error(error.message);
}

export type CreateTeamParams = {
  team_name: string;
  leader_name: string;
  email: string;
  password: string;
  zone: string;
  phone?: string;
};

export type CreateTeamResult = { id: string; team_code: string; team_name: string; email: string };

// Calls the create-team-member edge function (service-role only — see
// admin_panel/supabase/functions/create-team-member) so the new team's
// email/password becomes a real Supabase Auth login, usable immediately from
// the mobile app's "Field Team" sign-in tab.
export async function createTeam(params: CreateTeamParams): Promise<CreateTeamResult> {
  const { data, error } = await supabase.functions.invoke<{ team?: CreateTeamResult; error?: string }>(
    'create-team-member',
    { body: params }
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? error.message);
    }
    throw new Error(error.message);
  }
  if (!data?.team) throw new Error(data?.error ?? 'Could not create the team.');
  return data.team;
}

// ---------------- assignments ----------------

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed';

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export type AssignmentRow = {
  id: string;
  assignment_code: string;
  report_id: string;
  team_id: string | null;
  vehicle_id: string | null;
  vehicle_label: string | null;
  status: AssignmentStatus;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const ASSIGNMENT_COLUMNS =
  'id, assignment_code, report_id, team_id, vehicle_id, vehicle_label, status, assigned_at, started_at, completed_at, created_at';

export async function getAllAssignments(): Promise<AssignmentRow[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select(ASSIGNMENT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as AssignmentRow[];
}

export function subscribeToAssignmentChanges(handlers: {
  onInsert: (row: AssignmentRow) => void;
  onUpdate: (row: AssignmentRow) => void;
}) {
  const channel = supabase
    .channel('admin-assignment-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'assignments' },
      (payload) => handlers.onInsert(payload.new as AssignmentRow)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'assignments' },
      (payload) => handlers.onUpdate(payload.new as AssignmentRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Creates the assignment (status starts at 'pending') — the DB trigger
// moves the linked report to "Team Assigned" automatically, and (if a
// vehicle was picked) 004_vehicles.sql's triggers mark that vehicle Assigned
// and mirror its plate number into vehicle_label automatically.
export async function assignTeamToReport(params: {
  reportId: string;
  teamId: string;
  vehicleId?: string | null;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('assignments').upsert(
    {
      report_id: params.reportId,
      team_id: params.teamId,
      vehicle_id: params.vehicleId || null,
      status: 'pending',
      assigned_by: user?.id ?? null,
    },
    { onConflict: 'report_id' }
  );
  if (error) throw new Error(error.message);
}

export async function updateAssignmentStatus(id: string, status: AssignmentStatus): Promise<void> {
  const { error } = await supabase.from('assignments').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}
