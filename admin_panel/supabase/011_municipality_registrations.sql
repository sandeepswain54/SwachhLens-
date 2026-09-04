-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Backs the new "Register Your Municipality" flow on the public site
-- (Public Page/register.html), the municipality's own status/plan page
-- (Public Page/municipality-status.html), and the SwachhLens Admin
-- "Municipalities" review module (Public Page/Swachhlens Admin/municipalities.html).
--
-- SECURITY NOTE: the SwachhLens Admin login and the municipality "session"
-- used by these static pages are NOT real, server-checked authorization yet
-- (Admin is a hardcoded admin/admin gate; the municipality side falls back to
-- a browser localStorage id when email confirmation blocks a real session).
-- Because of that, the policies below are intentionally open (any visitor's
-- anon key can read/write this table) so the pages work end-to-end today.
-- Before this handles real citizens' data, replace them with policies scoped
-- to `auth.uid() = user_id` (municipality) and a real admin role/claim.

create extension if not exists pgcrypto;

create table if not exists public.municipality_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,

  municipality_name text not null,
  state text not null,
  district text not null,
  current_location text not null,
  latitude double precision,
  longitude double precision,
  municipality_type text not null,
  municipality_code text not null,

  official_email text not null,
  designation text not null,
  contact_number text not null,

  authorization_document_url text,
  municipality_image_url text,

  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'approved', 'rejected')),
  admin_comment text,
  plan text check (plan in ('basic', 'standard', 'smart_city')),

  submitted_at timestamptz not null default now(),
  under_review_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  plan_selected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists municipality_registrations_status_idx
  on public.municipality_registrations (status);

create index if not exists municipality_registrations_user_id_idx
  on public.municipality_registrations (user_id);

-- Keep updated_at current and auto-stamp the stepper timestamps whenever
-- status/plan change, so the SQL is the single source of truth for "when".
create or replace function public.set_municipality_registration_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status = 'under_review' and old.status = 'submitted' and new.under_review_at is null then
    new.under_review_at = now();
  end if;

  if new.status = 'approved' and new.approved_at is null then
    new.approved_at = now();
  end if;

  if new.status = 'rejected' and new.rejected_at is null then
    new.rejected_at = now();
  end if;

  if new.plan is not null and old.plan is null and new.plan_selected_at is null then
    new.plan_selected_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_municipality_registration_timestamps on public.municipality_registrations;
create trigger trg_municipality_registration_timestamps
before update on public.municipality_registrations
for each row execute function public.set_municipality_registration_timestamps();

-- Realtime, same idempotent pattern as every other table in this project —
-- so the admin's Municipalities list and the municipality's status page both
-- update live within a second or two, no refresh needed.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'municipality_registrations'
  ) then
    alter publication supabase_realtime add table public.municipality_registrations;
  end if;
end $$;

alter table public.municipality_registrations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'municipality_registrations'
      and policyname = 'Anyone can submit a municipality registration'
  ) then
    create policy "Anyone can submit a municipality registration"
      on public.municipality_registrations for insert
      to public
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'municipality_registrations'
      and policyname = 'Anyone can view municipality registrations'
  ) then
    create policy "Anyone can view municipality registrations"
      on public.municipality_registrations for select
      to public
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'municipality_registrations'
      and policyname = 'Anyone can update a municipality registration'
  ) then
    create policy "Anyone can update a municipality registration"
      on public.municipality_registrations for update
      to public
      using (true)
      with check (true);
  end if;
end $$;

-- Storage bucket for the two uploaded files (authorization document +
-- municipality image). Public bucket so the admin panel and the
-- municipality's own status page can just use the public URL.
insert into storage.buckets (id, name, public)
values ('municipality-documents', 'municipality-documents', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Anyone can upload municipality documents'
  ) then
    create policy "Anyone can upload municipality documents"
      on storage.objects for insert
      to public
      with check (bucket_id = 'municipality-documents');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Anyone can read municipality documents'
  ) then
    create policy "Anyone can read municipality documents"
      on storage.objects for select
      to public
      using (bucket_id = 'municipality-documents');
  end if;
end $$;
