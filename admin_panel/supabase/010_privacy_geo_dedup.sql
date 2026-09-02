-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Backend for the GPS-based 20-meter duplicate merging, unique-reporter
-- confirmation counting, and anti-spam protection (one person = one
-- confirmation per issue) described in AGENTS.md's feature spec.
--
--   1. `reports.confirmation_count` — denormalized count of unique
--      reporters for a ticket; starts at 1 (the creator).
--   2. `report_confirmations` — one row per (report, unique reporter). Its
--      primary key is the actual anti-spam mechanism: the same user simply
--      cannot insert a second row for the same report.
--   3. `confirm_existing_report()` — SECURITY DEFINER RPC used by
--      lib/reports.ts (via lib/duplicate-check.ts's
--      findActiveDuplicateWithin20m) whenever a submission lands within 20m
--      of an existing active report, and also once for every newly created
--      report to record its creator as the first confirmer. It records the
--      confirmation (no-ops if this user already confirmed this report),
--      recomputes confirmation_count, and bumps urgency_label using the
--      existing Normal/High/Urgent scale at the 3 / 10 unique-reporter
--      thresholds. SECURITY DEFINER for the same reason as
--      set_report_escalated() in 003_complaints_page.sql: `reports` has no
--      general "authenticated users can update" policy, so this is the only
--      way a citizen's client can touch another user's report row, and it
--      only ever touches confirmation_count/urgency_label.

-- ---------- 1. reports.confirmation_count ----------

alter table public.reports add column if not exists confirmation_count integer not null default 1;

-- ---------- 2. report_confirmations ----------

create table if not exists public.report_confirmations (
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

alter table public.report_confirmations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'report_confirmations'
      and policyname = 'Authenticated users can view all confirmations'
  ) then
    create policy "Authenticated users can view all confirmations"
      on public.report_confirmations for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'report_confirmations'
      and policyname = 'Users can add their own confirmation'
  ) then
    create policy "Users can add their own confirmation"
      on public.report_confirmations for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Speeds up the client-side 20-meter lookup in
-- lib/duplicate-check.ts::findActiveDuplicateWithin20m, which filters on
-- exactly these two columns before computing Haversine distance in JS
-- (same "fetch candidates, compute distance client-side" pattern already
-- used by checkForDuplicate() in that file — no PostGIS/earthdistance
-- dependency introduced).
create index if not exists idx_reports_category_status on public.reports(category, status);

-- ---------- 3. confirm_existing_report() ----------

create or replace function public.confirm_existing_report(p_report_id uuid)
returns table(confirmation_count integer, urgency_label text, already_confirmed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
  v_already boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.report_confirmations (report_id, user_id)
  values (p_report_id, v_uid)
  on conflict (report_id, user_id) do nothing;

  -- FOUND reflects the INSERT above: true if a row was actually inserted,
  -- false if ON CONFLICT DO NOTHING skipped it — i.e. this exact user had
  -- already confirmed this exact report before. This is the anti-spam
  -- check: "one person = one meaningful confirmation for the same issue."
  if not found then
    v_already := true;
  end if;

  select count(*) into v_count from public.report_confirmations where report_id = p_report_id;

  update public.reports
  set confirmation_count = v_count,
      urgency_label = case
        when v_count >= 10 then 'Urgent'
        when v_count >= 3 and urgency_label = 'Normal' then 'High'
        else urgency_label
      end
  where id = p_report_id;

  return query
    select r.confirmation_count, r.urgency_label, v_already
    from public.reports r
    where r.id = p_report_id;
end;
$$;

grant execute on function public.confirm_existing_report(uuid) to authenticated;
