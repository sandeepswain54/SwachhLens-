-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds the schema behind the field-team task-review workflow and the new
-- admin "Feedback" page:
--   1. Three new `assignments.status` values (`on_the_way`, `pending_review`)
--      plus review/evidence columns, behind the mobile app's Task Details ->
--      On the Way -> Work in Progress -> submitted-for-review flow.
--   2. An `assignment-media` storage bucket for field-staff-uploaded
--      "after" photos, mirroring 004_vehicles.sql's `vehicle-photos` bucket.
--   3. `sync_assignment_to_report()` (from 002_teams_assignments.sql) updated
--      to understand the two new statuses.
--   4. A new trigger that notifies a team when an admin approves or sends
--      back their `pending_review` submission, reusing the `notifications`
--      table from 006_field_team_notifications.sql.
--   5. A `feedback` table for citizen star-ratings on a resolved report, plus
--      a trigger that notifies the team the same way, behind the new
--      Feedback admin page.

-- ---------- 1. assignments: new statuses + review columns ----------

alter table public.assignments add column if not exists progress_photos text[] not null default '{}';
alter table public.assignments add column if not exists progress_notes text;
alter table public.assignments add column if not exists submitted_for_review_at timestamptz;
alter table public.assignments add column if not exists reviewed_at timestamptz;
alter table public.assignments add column if not exists reviewed_by uuid references auth.users(id);
alter table public.assignments add column if not exists review_note text;

-- 002_teams_assignments.sql defined this CHECK inline (no explicit name), so
-- Postgres auto-named it `assignments_status_check` — replace it with the
-- wider set. `on_the_way` = field team is travelling to the site (live map);
-- `pending_review` = evidence photos submitted, awaiting admin approval.
alter table public.assignments drop constraint if exists assignments_status_check;
alter table public.assignments add constraint assignments_status_check
  check (status in ('pending', 'on_the_way', 'in_progress', 'pending_review', 'completed'));

-- ---------- 2. assignment-media storage bucket ----------

insert into storage.buckets (id, name, public)
values ('assignment-media', 'assignment-media', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public can view assignment media'
  ) then
    create policy "Public can view assignment media"
      on storage.objects for select
      using (bucket_id = 'assignment-media');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can upload assignment media'
  ) then
    create policy "Authenticated users can upload assignment media"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'assignment-media');
  end if;
end $$;

-- ---------- 3. sync_assignment_to_report(): teach it the new statuses ----------

-- Citizen-facing `reports.status` deliberately stays a 4-value enum
-- (submitted/team_assigned/in_progress/resolved — see lib/reports.ts) even
-- though the field app's own `assignments.status` now has 5 values: both
-- `on_the_way` and `pending_review` still read as "in_progress" to a
-- citizen, since neither is a milestone worth a new stepper step for them.
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
    elsif new.status = 'on_the_way' then
      next_report_status := 'in_progress';
    elsif new.status = 'in_progress' then
      new.started_at := coalesce(new.started_at, now());
      next_report_status := 'in_progress';
    elsif new.status = 'pending_review' then
      new.submitted_for_review_at := coalesce(new.submitted_for_review_at, now());
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
-- (trg_sync_assignment_insert / trg_sync_assignment_update already exist
-- from 002_teams_assignments.sql and call this same function by name, so no
-- trigger changes are needed here.)

-- ---------- 4. notify a team when its submission is reviewed ----------

-- Separate AFTER trigger (rather than folding into sync_assignment_to_report
-- above) for the same reason 006_field_team_notifications.sql split
-- notify_team_on_assignment() out from the BEFORE trigger: this only ever
-- inserts a new `notifications` row, it doesn't need to mutate `new.*`.
create or replace function public.notify_team_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_code text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;
  if old.status <> 'pending_review' or new.team_id is null then
    return new;
  end if;

  select report_code::text into v_report_code from public.reports where id = new.report_id;

  if new.status = 'completed' then
    insert into public.notifications (team_id, assignment_id, report_id, title, body)
    values (
      new.team_id, new.id, new.report_id,
      'Task approved',
      'Your work on #' || coalesce(v_report_code, '') || ' was approved. Great job!'
    );
  elsif new.status = 'in_progress' then
    insert into public.notifications (team_id, assignment_id, report_id, title, body)
    values (
      new.team_id, new.id, new.report_id,
      'Changes requested',
      'Your submission for #' || coalesce(v_report_code, '') || ' needs another pass' ||
        case when new.review_note is not null and new.review_note <> '' then ': ' || new.review_note else '.' end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_team_on_review on public.assignments;
create trigger trg_notify_team_on_review
after update of status on public.assignments
for each row execute function public.notify_team_on_review();

-- ---------- 5. feedback ----------

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- One review per report, matching the mobile app's "rate this cleanup"
-- prompt only ever appearing once a report is resolved.
create unique index if not exists feedback_report_id_key on public.feedback (report_id);

alter table public.feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback' and policyname = 'Authenticated users can view all feedback'
  ) then
    create policy "Authenticated users can view all feedback"
      on public.feedback for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback' and policyname = 'Users can submit their own feedback'
  ) then
    create policy "Users can submit their own feedback"
      on public.feedback for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;

create or replace function public.notify_team_on_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_code text;
  v_stars text;
begin
  if new.team_id is null then
    return new;
  end if;

  select report_code::text into v_report_code from public.reports where id = new.report_id;
  v_stars := repeat('*', new.rating);

  insert into public.notifications (team_id, assignment_id, report_id, title, body)
  values (
    new.team_id, new.assignment_id, new.report_id,
    'New review: ' || v_stars || ' (' || new.rating || '/5)',
    coalesce(nullif(new.comment, ''), 'No comment left.') || ' — #' || coalesce(v_report_code, '')
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_team_on_feedback on public.feedback;
create trigger trg_notify_team_on_feedback
after insert on public.feedback
for each row execute function public.notify_team_on_feedback();

-- ---------- 6. realtime ----------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feedback'
  ) then
    alter publication supabase_realtime add table public.feedback;
  end if;
end $$;
