-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds the schema behind the admin panel's own bell icon / Notifications page:
--   1. `admin_notifications` — one shared feed for the whole admin/ops team
--      (not scoped to a single admin user, same "everyone signed into the
--      panel sees the same operational picture" model the rest of the
--      dashboard already uses), so the bell can show a real, realtime alert
--      instead of a static badge.
--   2. A trigger on `reports` that writes a "new_report" notification
--      automatically whenever a citizen submits a new complaint.
--   3. A trigger on `assignments` that writes a "submitted_for_review"
--      notification automatically whenever a field team's status moves to
--      `pending_review` (see 007_task_review_feedback.sql for that status).
--   4. A trigger on `feedback` that writes a "feedback" notification
--      automatically whenever a citizen rates a resolved report.
--   All three mirror the SECURITY DEFINER pattern already used by
--   `notify_team_on_assignment()` in 006_field_team_notifications.sql, since
--   `admin_notifications` intentionally has no "authenticated users can
--   insert" policy (nobody should be able to write themselves a fake alert).

-- ---------- 1. admin_notifications ----------

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_report', 'submitted_for_review', 'feedback')),
  report_id uuid references public.reports(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications (created_at desc);

alter table public.admin_notifications enable row level security;

do $$
begin
  -- Matches the existing "Authenticated users can view all feedback"-style
  -- policy on public.feedback: the admin panel's own login accounts are the
  -- only ones that ever hit this table, so this is not opening it up to
  -- citizens/field teams any more than that table already is.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_notifications' and policyname = 'Authenticated users can view admin notifications'
  ) then
    create policy "Authenticated users can view admin notifications"
      on public.admin_notifications for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_notifications' and policyname = 'Authenticated users can mark admin notifications read'
  ) then
    create policy "Authenticated users can mark admin notifications read"
      on public.admin_notifications for update to authenticated using (true) with check (true);
  end if;
end $$;

-- ---------- 2. notify-on-new-report trigger ----------

create or replace function public.notify_admin_on_new_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications (type, report_id, title, body)
  values (
    'new_report',
    new.id,
    'New complaint submitted',
    coalesce(new.category, 'A complaint') || ' reported at ' ||
      coalesce(new.address, 'an unknown location') ||
      ' (#' || coalesce(new.report_code::text, '') || ')'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_new_report on public.reports;
create trigger trg_notify_admin_on_new_report
after insert on public.reports
for each row execute function public.notify_admin_on_new_report();

-- ---------- 3. notify-on-submitted-for-review trigger ----------

create or replace function public.notify_admin_on_review_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_code text;
  v_team_name text;
begin
  -- Only fire the moment status actually becomes 'pending_review', not on
  -- every unrelated update to the row.
  if new.status <> 'pending_review' or old.status is not distinct from new.status then
    return new;
  end if;

  select report_code::text into v_report_code from public.reports where id = new.report_id;
  select team_name into v_team_name from public.teams where id = new.team_id;

  insert into public.admin_notifications (type, report_id, assignment_id, team_id, title, body)
  values (
    'submitted_for_review',
    new.report_id, new.id, new.team_id,
    'Work submitted for review',
    coalesce(v_team_name, 'A field team') || ' submitted evidence for #' ||
      coalesce(v_report_code, '') || ' — ready for your review.'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_review_submitted on public.assignments;
create trigger trg_notify_admin_on_review_submitted
after update of status on public.assignments
for each row execute function public.notify_admin_on_review_submitted();

-- ---------- 4. notify-on-feedback trigger ----------

create or replace function public.notify_admin_on_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_code text;
  v_stars text;
begin
  select report_code::text into v_report_code from public.reports where id = new.report_id;
  v_stars := repeat('★', new.rating);

  insert into public.admin_notifications (type, report_id, assignment_id, team_id, title, body)
  values (
    'feedback',
    new.report_id, new.assignment_id, new.team_id,
    'New citizen review: ' || v_stars || ' (' || new.rating || '/5)',
    coalesce(nullif(new.comment, ''), 'No comment left.') || ' — #' || coalesce(v_report_code, '')
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_feedback on public.feedback;
create trigger trg_notify_admin_on_feedback
after insert on public.feedback
for each row execute function public.notify_admin_on_feedback();

-- ---------- 5. realtime ----------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_notifications'
  ) then
    alter publication supabase_realtime add table public.admin_notifications;
  end if;
end $$;
