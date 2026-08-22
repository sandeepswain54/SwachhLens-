-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds the schema behind the mobile app's Field Team Home screen:
--   1. `notifications` — one row per team every time an assignment is
--      created for them (or reassigned to them), so the Home screen's bell
--      icon can show a real, realtime "you were just given a task" alert
--      instead of a static dot.
--   2. A trigger on `assignments` that writes that notification
--      automatically whenever `team_id` is set on insert, or changed on
--      update (reassignment) — mirrors the SECURITY DEFINER pattern already
--      used by `sync_assignment_to_report()` in 002_teams_assignments.sql,
--      since `notifications` intentionally has no "authenticated users can
--      insert" policy (a team should never be able to write itself a fake
--      notification).

-- ---------- 1. notifications ----------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_team_id_idx on public.notifications (team_id, created_at desc);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Team can view own notifications'
  ) then
    create policy "Team can view own notifications"
      on public.notifications for select to authenticated
      using (team_id in (select id from public.teams where auth_user_id = auth.uid()));
  end if;

  -- Only lets a team flip is_read on its own rows (e.g. tapping a
  -- notification to mark it read) — never insert or read anyone else's.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Team can mark own notifications read'
  ) then
    create policy "Team can mark own notifications read"
      on public.notifications for update to authenticated
      using (team_id in (select id from public.teams where auth_user_id = auth.uid()))
      with check (team_id in (select id from public.teams where auth_user_id = auth.uid()));
  end if;
end $$;

-- ---------- 2. notify-on-assignment trigger ----------

create or replace function public.notify_team_on_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report record;
begin
  if new.team_id is null then
    return new;
  end if;
  -- Only fire when a team is newly attached to this assignment: every
  -- insert with a team_id, or an update that actually changes team_id
  -- (reassignment) — not every unrelated status update.
  if tg_op = 'UPDATE' and old.team_id is not distinct from new.team_id then
    return new;
  end if;

  select report_code, category, address into v_report
  from public.reports where id = new.report_id;

  insert into public.notifications (team_id, assignment_id, report_id, title, body)
  values (
    new.team_id,
    new.id,
    new.report_id,
    'New task assigned',
    coalesce(v_report.category, 'A task') || ' reported at ' ||
      coalesce(v_report.address, 'an unknown location') ||
      ' (#' || coalesce(v_report.report_code::text, '') || ')'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_team_on_assignment on public.assignments;
create trigger trg_notify_team_on_assignment
after insert or update of team_id on public.assignments
for each row execute function public.notify_team_on_assignment();

-- ---------- 3. realtime ----------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
