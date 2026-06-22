-- Run this in the Supabase SQL editor to set up the backend.
-- The app uses the anon key only (no auth), so RLS allows public read/insert/update.
-- This is fine for a one-day private event; tighten before any public exposure.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  device_id text not null unique,
  name text not null,
  distance_m integer not null default 0,
  avatar text,
  lat double precision,
  lng double precision,
  updated_at timestamptz not null default now()
);

-- Avatar + live position columns (safe to re-run on an existing DB).
alter table participants add column if not exists avatar text;
alter table participants add column if not exists lat double precision;
alter table participants add column if not exists lng double precision;

create table if not exists checkpoint_progress (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  checkpoint_id text not null,
  via_manual boolean not null default false,
  unlocked_at timestamptz not null default now(),
  unique (team_id, checkpoint_id)
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  checkpoint_id text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Realtime
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table checkpoint_progress;

-- Open RLS (event-only; revisit before public use)
alter table teams enable row level security;
alter table participants enable row level security;
alter table checkpoint_progress enable row level security;
alter table photos enable row level security;

create policy "public teams" on teams for all using (true) with check (true);
create policy "public participants" on participants for all using (true) with check (true);
create policy "public checkpoints" on checkpoint_progress for all using (true) with check (true);
create policy "public photos" on photos for all using (true) with check (true);

-- Storage bucket for the quarry group photos (create in dashboard or here):
-- insert into storage.buckets (id, name, public) values ('photos','photos', true);
