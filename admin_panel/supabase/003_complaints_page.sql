-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds the schema behind the "Complaints" admin page:
--   1. `profiles` — so "Reported By" can show a real citizen name (the anon
--      key can't read auth.users directly; this mirrors the standard
--      Supabase "shadow profiles table" pattern).
--   2. `reports.escalated` — the Complaints page's Escalate action and
--      Escalated tab/badge needed a real column; there was no concept of
--      escalation in the schema before this page.
--   3. Two narrowly-scoped SECURITY DEFINER functions so admins can escalate
--      or resolve a complaint directly, without opening a blanket
--      "authenticated users can update anything on reports" policy (same
--      reasoning as the assignment-sync trigger in 002_teams_assignments.sql).

-- ---------- 1. profiles ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'SwachhLens User',
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Authenticated users can view all profiles'
  ) then
    create policy "Authenticated users can view all profiles"
      on public.profiles for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

-- Keeps `profiles` populated automatically for every new signup (citizen or
-- team login), pulling the same `full_name` the mobile app already writes to
-- auth user_metadata on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'SwachhLens User'), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill every account that already existed before this migration ran.
insert into public.profiles (id, full_name, email)
select id, coalesce(raw_user_meta_data->>'full_name', 'SwachhLens User'), email
from auth.users
on conflict (id) do nothing;

-- ---------- 2. escalation ----------

alter table public.reports add column if not exists escalated boolean not null default false;
alter table public.reports add column if not exists escalated_at timestamptz;
alter table public.reports add column if not exists escalated_by uuid references auth.users(id);

-- SECURITY DEFINER on purpose, same reasoning as sync_assignment_to_report()
-- in 002_teams_assignments.sql: `reports` deliberately has no general
-- "authenticated users can update" policy, so these two functions are the
-- only way the Complaints page can change a report outside the
-- assignment-status trigger, and each only ever touches its own narrow set
-- of columns.
create or replace function public.set_report_escalated(p_report_id uuid, p_escalated boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reports
  set escalated = p_escalated,
      escalated_at = case when p_escalated then now() else null end,
      escalated_by = case when p_escalated then auth.uid() else escalated_by end
  where id = p_report_id;
end;
$$;

grant execute on function public.set_report_escalated(uuid, boolean) to authenticated;

-- Lets an admin resolve a complaint directly from the Complaints page even
-- when it has no assignment yet (or the assigned team hasn't marked it done)
-- — an explicit override, distinct from the normal
-- assign -> start -> complete flow on the Teams & Assignments page. Also
-- completes the linked assignment (if any) so the two pages never disagree.
create or replace function public.mark_report_resolved(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reports set status = 'resolved' where id = p_report_id;
  update public.assignments
  set status = 'completed'
  where report_id = p_report_id and status <> 'completed';
end;
$$;

grant execute on function public.mark_report_resolved(uuid) to authenticated;

-- `reports` realtime + the "view all reports" policy were already added in
-- 001_admin_dashboard.sql, so escalated/status changes made here show up
-- live with no further setup.
