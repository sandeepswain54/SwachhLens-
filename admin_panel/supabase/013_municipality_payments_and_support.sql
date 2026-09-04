-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds two things for the municipality dashboard's "Plans & Payment" and
-- "Support" tabs (Public Page/municipality-status.html):
--   1. municipality_payments — a real payment history log. confirm-payment
--      (admin_panel/supabase/functions/confirm-payment) inserts one row here
--      every time a Stripe Checkout session is verified as paid, in addition
--      to updating municipality_registrations' current plan/status.
--   2. municipality_support_requests — lets a signed-in municipality submit
--      a support request and see its own history.

create table if not exists public.municipality_payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.municipality_registrations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  plan text not null check (plan in ('basic', 'standard', 'smart_city')),
  amount numeric not null,
  currency text not null default 'inr',
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  stripe_session_id text,

  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists municipality_payments_registration_id_idx
  on public.municipality_payments (registration_id);

create index if not exists municipality_payments_user_id_idx
  on public.municipality_payments (user_id);

alter table public.municipality_payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'municipality_payments'
      and policyname = 'Anyone can view payment history'
  ) then
    create policy "Anyone can view payment history"
      on public.municipality_payments for select
      to public
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'municipality_payments'
  ) then
    alter publication supabase_realtime add table public.municipality_payments;
  end if;
end $$;

-- ---------------------------------------------------------------------

create table if not exists public.municipality_support_requests (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.municipality_registrations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_reply text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists municipality_support_requests_registration_id_idx
  on public.municipality_support_requests (registration_id);

alter table public.municipality_support_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'municipality_support_requests'
      and policyname = 'Anyone can submit a support request'
  ) then
    create policy "Anyone can submit a support request"
      on public.municipality_support_requests for insert
      to public
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'municipality_support_requests'
      and policyname = 'Anyone can view support requests'
  ) then
    create policy "Anyone can view support requests"
      on public.municipality_support_requests for select
      to public
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'municipality_support_requests'
  ) then
    alter publication supabase_realtime add table public.municipality_support_requests;
  end if;
end $$;
