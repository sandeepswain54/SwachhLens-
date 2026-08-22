-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds the schema behind the "Users" admin page's Block/Unblock action.
-- There's no separate "blocked" concept anywhere yet — blocking a user has
-- to stop them signing in at the Supabase Auth level (a real
-- `auth.admin.updateUserById(..., { ban_duration })` call), which needs the
-- service-role key and so can only happen inside an edge function (see
-- supabase/functions/set-user-blocked). This migration just adds a mirror of
-- that ban state onto `profiles` so the Users page can render/filter/sort by
-- it instantly and get realtime updates, without calling an edge function on
-- every page load just to read status.

alter table public.profiles add column if not exists is_blocked boolean not null default false;
alter table public.profiles add column if not exists blocked_at timestamptz;
alter table public.profiles add column if not exists blocked_by uuid references auth.users(id);

-- Realtime, same idempotent pattern as every other table in this project —
-- so a block/unblock (or a brand new signup) shows up on the Users page
-- within a second or two, no refresh needed.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
