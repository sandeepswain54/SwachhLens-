-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds Stripe (test mode) payment tracking to municipality_registrations, so
-- a municipality only gets access to admin_panel once they've actually paid
-- for a plan — see:
--   - Public Page/municipality-status.js (Choose Plan -> Stripe Checkout)
--   - admin_panel/supabase/functions/create-checkout-session
--   - admin_panel/supabase/functions/confirm-payment
--   - admin_panel/src/contexts/AuthContext.tsx (the actual access gate)

alter table public.municipality_registrations
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid')),
  add column if not exists stripe_session_id text,
  add column if not exists paid_at timestamptz;

create index if not exists municipality_registrations_stripe_session_id_idx
  on public.municipality_registrations (stripe_session_id);
