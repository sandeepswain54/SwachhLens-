-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.

-- 1. Track when a report actually became resolved, so the admin dashboard can
--    show a real "Average Resolution Time" instead of guessing from created_at.
alter table public.reports add column if not exists resolved_at timestamptz;

create or replace function public.set_reports_resolved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'resolved' and (old.status is distinct from 'resolved') then
    new.resolved_at = now();
  elsif new.status <> 'resolved' then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reports_resolved_at on public.reports;
create trigger trg_reports_resolved_at
before update on public.reports
for each row execute function public.set_reports_resolved_at();

-- 2. Make sure realtime is turned on for this table (INSERT + UPDATE events)
--    so the admin dashboard updates live when the mobile app submits a report
--    or a status changes. No-ops if it's already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end $$;

-- 3. Let any signed-in user read every report (needed for both the mobile
--    app's community hotspot map and this admin dashboard). Skip this if you
--    already created an equivalent "authenticated users can view all
--    reports" policy.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reports'
      and policyname = 'Authenticated users can view all reports'
  ) then
    create policy "Authenticated users can view all reports"
      on public.reports for select
      to authenticated
      using (true);
  end if;
end $$;
