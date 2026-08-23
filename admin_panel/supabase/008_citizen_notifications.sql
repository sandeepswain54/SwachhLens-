-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds the schema behind the citizen app's Home screen bell icon:
--   1. `citizen_notifications` — one row per citizen every time one of their
--      own reports is marked resolved, or a field team is assigned to it,
--      so the bell can show a real, realtime alert with a badge instead of
--      a static dot.
--   2. A trigger on `reports` that writes a "resolved" notification
--      automatically whenever `status` transitions to 'resolved'.
--   3. A trigger on `assignments` that writes an "assigned" notification
--      (naming the field team/leader) automatically whenever a team is
--      newly attached to a report's assignment.
--   Both mirror the SECURITY DEFINER pattern already used by
--   `notify_team_on_assignment()` in 006_field_team_notifications.sql,
--   since `citizen_notifications` intentionally has no "authenticated
--   users can insert" policy (a citizen should never be able to write
--   themselves a fake notification).

-- ---------- 1. citizen_notifications ----------

create table if not exists public.citizen_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists citizen_notifications_user_id_idx
  on public.citizen_notifications (user_id, created_at desc);

alter table public.citizen_notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'citizen_notifications' and policyname = 'Citizen can view own notifications'
  ) then
    create policy "Citizen can view own notifications"
      on public.citizen_notifications for select to authenticated
      using (user_id = auth.uid());
  end if;

  -- Only lets a citizen flip is_read on their own rows (e.g. tapping a
  -- notification to mark it read) — never insert or read anyone else's.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'citizen_notifications' and policyname = 'Citizen can mark own notifications read'
  ) then
    create policy "Citizen can mark own notifications read"
      on public.citizen_notifications for update to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- ---------- 2. notify-on-resolved trigger ----------

create or replace function public.notify_citizen_on_report_resolved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire the moment status actually becomes 'resolved', not on every
  -- unrelated update to the row.
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    insert into public.citizen_notifications (user_id, report_id, title, body)
    values (
      new.user_id,
      new.id,
      'Report resolved',
      coalesce(new.category, 'Your report') || ' at ' ||
        coalesce(new.address, 'the reported location') ||
        ' has been resolved (#' || coalesce(new.report_code::text, '') || ')'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_citizen_on_report_resolved on public.reports;
create trigger trg_notify_citizen_on_report_resolved
after update of status on public.reports
for each row execute function public.notify_citizen_on_report_resolved();

-- ---------- 3. notify-on-assignment trigger ----------

create or replace function public.notify_citizen_on_team_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report record;
  v_team record;
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

  select user_id, category, address into v_report
  from public.reports where id = new.report_id;

  select team_name, leader_name into v_team
  from public.teams where id = new.team_id;

  if v_report.user_id is null then
    return new;
  end if;

  insert into public.citizen_notifications (user_id, report_id, title, body)
  values (
    v_report.user_id,
    new.report_id,
    'Field team assigned',
    coalesce(v_team.leader_name, 'A field team') ||
      ' from ' || coalesce(v_team.team_name, 'the cleanup team') ||
      ' has been assigned to your ' || coalesce(v_report.category, 'report') ||
      ' report at ' || coalesce(v_report.address, 'the reported location') ||
      ' — they will arrive soon.'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_citizen_on_team_assigned on public.assignments;
create trigger trg_notify_citizen_on_team_assigned
after insert or update of team_id on public.assignments
for each row execute function public.notify_citizen_on_team_assigned();

-- ---------- 4. realtime ----------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'citizen_notifications'
  ) then
    alter publication supabase_realtime add table public.citizen_notifications;
  end if;
end $$;
