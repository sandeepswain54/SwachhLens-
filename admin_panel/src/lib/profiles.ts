import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from './supabase';

// Populated by the `handle_new_user` trigger added in
// 003_complaints_page.sql — lets the Complaints page show a real "Reported
// By" name without the anon key needing to read `auth.users` directly.
// `is_blocked`/`blocked_at`/`blocked_by` (005_users_page.sql) mirror the
// real Supabase Auth ban state so the Users page can render/filter it
// instantly and get realtime updates without calling an edge function.
export type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_by: string | null;
};

const PROFILE_COLUMNS = 'id, full_name, email, created_at, is_blocked, blocked_at, blocked_by';

export async function getAllProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileRow[];
}

// Fires on every new signup (citizen or field team) and every block/unblock
// — the same postgres_changes realtime pattern every other context in this
// app uses, so the Users page updates live with no polling.
export function subscribeToProfileChanges(handlers: {
  onInsert: (row: ProfileRow) => void;
  onUpdate: (row: ProfileRow) => void;
}) {
  const channel = supabase
    .channel('admin-profiles-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'profiles' },
      (payload) => handlers.onInsert(payload.new as ProfileRow)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles' },
      (payload) => handlers.onUpdate(payload.new as ProfileRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Real auth-level metadata (last sign-in, current ban expiry) that only
// `auth.users` holds — fetched via the list-users-auth-meta edge function
// (service-role only, see supabase/functions/). Best-effort: callers should
// treat a thrown error here as "not available" rather than fatal, since the
// Users page's core table already works off `profiles` alone.
export type AuthMeta = { id: string; lastSignInAt: string | null; bannedUntil: string | null };

export async function getUsersAuthMeta(): Promise<AuthMeta[]> {
  const { data, error } = await supabase.functions.invoke<{ users?: AuthMeta[]; error?: string }>(
    'list-users-auth-meta',
    { body: {} }
  );
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? error.message);
    }
    throw new Error(error.message);
  }
  return data?.users ?? [];
}

// Blocks (or unblocks) a user's ability to sign in — calls the
// set-user-blocked edge function (service-role, see supabase/functions/)
// since actually banning an auth.users account can't be done with the anon
// key. Blocking takes effect immediately: a blocked user's next sign-in
// attempt (mobile app or admin panel) is rejected by Supabase Auth itself.
export async function setUserBlocked(userId: string, blocked: boolean): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>('set-user-blocked', {
    body: { userId, blocked },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? error.message);
    }
    throw new Error(error.message);
  }
  if (!data?.ok) throw new Error(data?.error ?? 'Could not update the user.');
}
