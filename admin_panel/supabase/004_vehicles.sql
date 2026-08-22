-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- Adds the schema behind the "Vehicles" admin page (fleet management):
--   1. `vehicles` — the fleet itself (plate, type, capacity, driver, fuel,
--      status, live location, image, paperwork dates).
--   2. `vehicle_activity` — the page's "Recent Vehicle Activity" feed, also
--      the source of the "This Week Overview" distance/fuel/trip numbers.
--   3. `vehicle_maintenance` — the "Maintenance Schedule" card's tasks.
--   4. `assignments.vehicle_id` — replaces the free-text `vehicle_label`
--      stand-in from 002_teams_assignments.sql with a real link to a vehicle,
--      and two triggers that keep a vehicle's status/location/fuel in sync
--      with the lifecycle of whatever assignment it's attached to, so the
--      Vehicles page updates in realtime as complaints get assigned, started,
--      and completed.

-- ---------- 1. vehicles ----------

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_no text unique not null,
  vehicle_type text not null default 'Mini Truck',
  capacity_tons numeric,
  model text,
  driver_name text,
  driver_contact text,
  fuel_type text not null default 'Diesel' check (fuel_type in ('Diesel', 'Petrol', 'CNG', 'Electric')),
  fuel_level int not null default 100 check (fuel_level between 0 and 100),
  status text not null default 'idle' check (status in ('on_duty', 'assigned', 'maintenance', 'idle')),
  location_label text,
  latitude numeric,
  longitude numeric,
  assigned_team_id uuid references public.teams(id) on delete set null,
  image_url text,
  odometer_km numeric not null default 0,
  registration_date date,
  insurance_valid_till date,
  fitness_valid_till date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_vehicle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_vehicle_updated_at on public.vehicles;
create trigger trg_vehicle_updated_at
before update on public.vehicles
for each row execute function public.set_vehicle_updated_at();

alter table public.vehicles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vehicles' and policyname = 'Authenticated users can view all vehicles'
  ) then
    create policy "Authenticated users can view all vehicles"
      on public.vehicles for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vehicles' and policyname = 'Authenticated users can add vehicles'
  ) then
    create policy "Authenticated users can add vehicles"
      on public.vehicles for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vehicles' and policyname = 'Authenticated users can update vehicles'
  ) then
    create policy "Authenticated users can update vehicles"
      on public.vehicles for update to authenticated using (true) with check (true);
  end if;
end $$;

-- ---------- 2. vehicle_activity ----------

create table if not exists public.vehicle_activity (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  activity_type text not null check (
    activity_type in (
      'assigned', 'trip_started', 'trip_completed', 'fuel_refilled',
      'maintenance_started', 'maintenance_completed', 'inspection_completed',
      'status_changed', 'created'
    )
  ),
  description text not null,
  location text,
  distance_km numeric,
  fuel_used_l numeric,
  performed_by text not null default 'Admin User',
  created_at timestamptz not null default now()
);

create index if not exists vehicle_activity_vehicle_id_idx on public.vehicle_activity (vehicle_id, created_at desc);

alter table public.vehicle_activity enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vehicle_activity' and policyname = 'Authenticated users can view all vehicle activity'
  ) then
    create policy "Authenticated users can view all vehicle activity"
      on public.vehicle_activity for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vehicle_activity' and policyname = 'Authenticated users can log vehicle activity'
  ) then
    create policy "Authenticated users can log vehicle activity"
      on public.vehicle_activity for insert to authenticated with check (true);
  end if;
end $$;

-- ---------- 3. vehicle_maintenance ----------

create table if not exists public.vehicle_maintenance (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  task text not null,
  kind text not null default 'service' check (kind in ('service', 'inspection', 'replacement')),
  due_date date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_maintenance_vehicle_id_idx on public.vehicle_maintenance (vehicle_id, due_date);

alter table public.vehicle_maintenance enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vehicle_maintenance' and policyname = 'Authenticated users can view all maintenance'
  ) then
    create policy "Authenticated users can view all maintenance"
      on public.vehicle_maintenance for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vehicle_maintenance' and policyname = 'Authenticated users can schedule maintenance'
  ) then
    create policy "Authenticated users can schedule maintenance"
      on public.vehicle_maintenance for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vehicle_maintenance' and policyname = 'Authenticated users can update maintenance'
  ) then
    create policy "Authenticated users can update maintenance"
      on public.vehicle_maintenance for update to authenticated using (true) with check (true);
  end if;
end $$;

-- ---------- 4. link assignments -> vehicles ----------

alter table public.assignments add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null;

-- Keeps the pre-existing free-text `vehicle_label` column (still read by
-- every existing UI: ActiveAssignmentsTable, AssignmentTab, TimelineTab...)
-- in sync with whatever real vehicle gets picked from the new dropdown, so
-- none of that UI needed to change to show the right plate number.
create or replace function public.sync_assignment_vehicle_label()
returns trigger
language plpgsql
as $$
begin
  if new.vehicle_id is not null then
    select vehicle_no into new.vehicle_label from public.vehicles where id = new.vehicle_id;
  else
    new.vehicle_label := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_assignment_vehicle_label on public.assignments;
create trigger trg_sync_assignment_vehicle_label
before insert or update of vehicle_id on public.assignments
for each row execute function public.sync_assignment_vehicle_label();

-- Drives the Vehicles page's realtime behavior from the assignment lifecycle
-- that already exists (pending -> in_progress -> completed): picking a
-- vehicle marks it Assigned, starting the job puts it On Duty, and
-- completing the job frees it back up, logs a simulated trip (distance +
-- fuel burned, since there's no real telematics device), and moves its live
-- location to wherever the job actually was.
create or replace function public.sync_assignment_to_vehicle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report record;
  v_team_code text;
  v_distance numeric;
  v_fuel numeric;
  v_fuel_pct int;
begin
  -- Free the previously assigned vehicle (if it changed away and nothing
  -- else active still points at it).
  if tg_op = 'UPDATE' and old.vehicle_id is not null and old.vehicle_id is distinct from new.vehicle_id then
    if not exists (
      select 1 from public.assignments
      where vehicle_id = old.vehicle_id and status <> 'completed' and id <> new.id
    ) then
      update public.vehicles set status = 'idle', assigned_team_id = null where id = old.vehicle_id;
    end if;
  end if;

  if new.vehicle_id is null then
    return new;
  end if;

  select * into v_report from public.reports where id = new.report_id;
  select team_code into v_team_code from public.teams where id = new.team_id;

  if new.status = 'pending' and (tg_op = 'INSERT' or old.vehicle_id is distinct from new.vehicle_id or old.status is distinct from new.status) then
    update public.vehicles
      set status = 'assigned',
          assigned_team_id = new.team_id,
          location_label = coalesce(v_report.address, location_label)
      where id = new.vehicle_id;

    insert into public.vehicle_activity (vehicle_id, activity_type, description, location, performed_by)
      values (new.vehicle_id, 'assigned', 'Assigned to ' || coalesce(v_team_code, 'a team'), v_report.address, 'Admin User');

  elsif new.status = 'in_progress' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    update public.vehicles set status = 'on_duty' where id = new.vehicle_id;

    insert into public.vehicle_activity (vehicle_id, activity_type, description, location, performed_by)
      values (new.vehicle_id, 'trip_started', 'Trip started', v_report.address, 'Admin User');

  elsif new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    -- Simulated trip: no telematics device exists, so a plausible short
    -- cleanup-run distance/fuel burn is derived instead of faking precision.
    v_distance := round((3 + random() * 7)::numeric, 1);
    v_fuel := round((v_distance / 5.5)::numeric, 2);
    v_fuel_pct := least(20, greatest(3, round(v_distance * 1.4)));

    update public.vehicles
      set status = 'idle',
          assigned_team_id = null,
          fuel_level = greatest(5, fuel_level - v_fuel_pct),
          odometer_km = odometer_km + v_distance,
          location_label = coalesce(v_report.address, location_label),
          latitude = coalesce(v_report.latitude, latitude),
          longitude = coalesce(v_report.longitude, longitude)
      where id = new.vehicle_id;

    insert into public.vehicle_activity (vehicle_id, activity_type, description, location, performed_by, distance_km, fuel_used_l)
      values (new.vehicle_id, 'trip_completed', 'Trip completed', v_report.address, 'Admin User', v_distance, v_fuel);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_assignment_to_vehicle on public.assignments;
create trigger trg_sync_assignment_to_vehicle
after insert or update of vehicle_id, status on public.assignments
for each row execute function public.sync_assignment_to_vehicle();

-- ---------- 5. realtime ----------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vehicles'
  ) then
    alter publication supabase_realtime add table public.vehicles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vehicle_activity'
  ) then
    alter publication supabase_realtime add table public.vehicle_activity;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vehicle_maintenance'
  ) then
    alter publication supabase_realtime add table public.vehicle_maintenance;
  end if;
end $$;

-- ---------- 6. vehicle photo storage ----------

insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public can view vehicle photos'
  ) then
    create policy "Public can view vehicle photos"
      on storage.objects for select
      using (bucket_id = 'vehicle-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can upload vehicle photos'
  ) then
    create policy "Authenticated users can upload vehicle photos"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'vehicle-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can replace vehicle photos'
  ) then
    create policy "Authenticated users can replace vehicle photos"
      on storage.objects for update to authenticated
      using (bucket_id = 'vehicle-photos')
      with check (bucket_id = 'vehicle-photos');
  end if;
end $$;
