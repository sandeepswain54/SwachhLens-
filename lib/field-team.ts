import { supabase, uniqueChannel } from '@/lib/supabase';

export type TeamStatus = 'on_duty' | 'available' | 'maintenance';

export const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  on_duty: 'On Duty',
  available: 'Available',
  maintenance: 'Maintenance',
};

export type MyTeam = {
  id: string;
  team_code: string;
  team_name: string;
  leader_name: string;
  zone: string;
  status: TeamStatus;
  work_since: string;
};

const TEAM_COLUMNS = 'id, team_code, team_name, leader_name, zone, status, work_since';

// Looks up the `teams` row backing the currently signed-in auth user, if
// any. Returns null for a citizen login — that's how the login screen tells
// the two account types apart (see app/login.tsx).
export async function getMyTeam(): Promise<MyTeam | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('teams')
    .select(TEAM_COLUMNS)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as MyTeam | null;
}

// Live-updates the Home screen's zone/status header if an admin edits this
// team's record while the app is open.
export function subscribeToMyTeam(teamId: string, onUpdate: (row: MyTeam) => void) {
  const channel = supabase
    .channel(uniqueChannel(`field-team-${teamId}`))
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` },
      (payload) => onUpdate(payload.new as MyTeam)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
