-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds the schema behind the "Teams & Assignments" admin page: cleanup teams
-- (each backed by a real auth.users login, created via the create-team-member
-- edge function) and assignments linking a report to a team.

-- ---------- 1. teams ----------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  team_code text unique,
  team_name text not null,
  leader_name text not null,
  email text unique not null,
  phone text,
  zone text not null default 'Zone-1',
  status text not null default 'available' check (status in ('on_duty', 'available', 'maintenance')),
  member_count int not null default 1 check (member_count > 0),
  member_capacity int not null default 25 check (member_capacity > 0),
  -- Rough "how many assignments is a full day for this team" used only to
  -- turn a live assignment count into a workload percentage.
  daily_capacity int not null default 6 check (daily_capacity > 0),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_by uuid references auth.users(id),
  work_since timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create sequence if not exists public.team_code_seq start with 1;

create or replace function public.set_team_code()
returns trigger
language plpgsql
as $$
begin
  if new.team_code is null then
    new.team_code := 'TEAM-' || lpad(nextval('public.team_code_seq')::text, 2, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_team_code on public.teams;
create trigger trg_set_team_code
before insert on public.teams
for each row execute function public.set_team_code();

alter table public.teams enable row level security;

-- Matches the "any authenticated user" pattern already used for `reports` in
-- 001_admin_dashboard.sql (there's no admin-role system yet — see
-- admin_panel/README.md limitations).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teams' and policyname = 'Authenticated users can view all teams'
  ) then
    create policy "Authenticated users can view all teams"
      on public.teams for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teams' and policyname = 'Authenticated users can create teams'
  ) then
    create policy "Authenticated users can create teams"
      on public.teams for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teams' and policyname = 'Authenticated users can update teams'
  ) then
    create policy "Authenticated users can update teams"
      on public.teams for update to authenticated using (true) with check (true);
  end if;
end $$;

-- ---------- 2. assignments ----------

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_code text unique,
  report_id uuid not null references public.reports(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  -- Free-text stand-in for a real fleet/vehicles module, which doesn't exist
  -- yet (the Vehicles nav page is still a placeholder) — lets an admin note
  -- e.g. "Mini Truck OD-02-AB-1234" against an assignment without faking a
  -- whole vehicles table.
  vehicle_label text,
  -- pending = team picked, not started yet; matches the Teams & Assignments
  -- page's 3 tabs (there's no separate "assigned but not accepted" state).
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  assigned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- One active assignment per report.
create unique index if not exists assignments_report_id_key on public.assignments (report_id);

create sequence if not exists public.assignment_code_seq start with 1200;

create or replace function public.set_assignment_code()
returns trigger
language plpgsql
as $$
begin
  if new.assignment_code is null then
    new.assignment_code := 'ASN-' || nextval('public.assignment_code_seq')::text;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_assignment_code on public.assignments;
create trigger trg_set_assignment_code
before insert on public.assignments
for each row execute function public.set_assignment_code();

-- Keeps `assignments` and `public.reports.status` (the Dashboard's source of
-- truth) in sync automatically: assigning/progressing/completing an
-- assignment here immediately moves the linked report through
-- submitted -> team_assigned -> in_progress -> resolved, so the Dashboard
-- and this page never disagree.
--
-- SECURITY DEFINER on purpose: `reports` intentionally has no general
-- "authenticated users can update" policy (that would let any citizen
-- account rewrite any report's category/address/etc. via a raw REST call).
-- This function only ever touches the single `status` column, and only in
-- response to an assignment's own status changing.
create or replace function public.sync_assignment_to_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed boolean := (tg_op = 'INSERT') or (old.status is distinct from new.status);
  next_report_status text;
begin
  if changed then
    if new.status = 'pending' then
      new.assigned_at := coalesce(new.assigned_at, now());
      next_report_status := 'team_assigned';
    elsif new.status = 'in_progress' then
      new.started_at := coalesce(new.started_at, now());
      next_report_status := 'in_progress';
    elsif new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
      next_report_status := 'resolved';
    end if;

    if next_report_status is not null then
      update public.reports set status = next_report_status where id = new.report_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_assignment_insert on public.assignments;
create trigger trg_sync_assignment_insert
before insert on public.assignments
for each row execute function public.sync_assignment_to_report();

drop trigger if exists trg_sync_assignment_update on public.assignments;
create trigger trg_sync_assignment_update
before update on public.assignments
for each row execute function public.sync_assignment_to_report();

alter table public.assignments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'assignments' and policyname = 'Authenticated users can view all assignments'
  ) then
    create policy "Authenticated users can view all assignments"
      on public.assignments for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'assignments' and policyname = 'Authenticated users can create assignments'
  ) then
    create policy "Authenticated users can create assignments"
      on public.assignments for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'assignments' and policyname = 'Authenticated users can update assignments'
  ) then
    create policy "Authenticated users can update assignments"
      on public.assignments for update to authenticated using (true) with check (true);
  end if;
end $$;

-- ---------- 3. realtime ----------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teams'
  ) then
    alter publication supabase_realtime add table public.teams;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'assignments'
  ) then
    alter publication supabase_realtime add table public.assignments;
  end if;
end $$;
