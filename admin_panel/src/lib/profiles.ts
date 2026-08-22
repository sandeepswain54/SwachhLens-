import { supabase } from './supabase';

// Populated by the `handle_new_user` trigger added in
// 003_complaints_page.sql — lets the Complaints page show a real "Reported
// By" name without the anon key needing to read `auth.users` directly.
export type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
};

export async function getAllProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from('profiles').select('id, full_name, email');
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileRow[];
}
