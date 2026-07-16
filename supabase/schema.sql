-- Hindhede Wellness Walk — SOLO schema (v2, evolving avatars).
-- Run in the Supabase SQL editor. The app uses the anon key only (no auth),
-- so RLS allows public read/insert/update. Fine for a one-day private event;
-- tighten before any public exposure.
--
-- v2 changes vs v1: teams are gone. Every walker is an individual with a
-- unique name; checkpoint progress is per-device; participants.avatar now
-- stores the encoded evolving-avatar state (e.g. "014|m1s0w2o1b1c2|durian_dodger").
-- This drops the v1 tables — it's a one-day event app with no data to keep.

drop table if exists photos;
drop table if exists checkpoint_progress;
drop table if exists participants;
drop table if exists teams;

create table participants (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  name text not null,
  distance_m integer not null default 0,
  -- Encoded evolving-avatar state (base + trait levels + earned background).
  avatar text,
  lat double precision,
  lng double precision,
  updated_at timestamptz not null default now()
);

-- Unique walker names (case-insensitive). The app also checks before joining
-- so users get a friendly message instead of a DB error.
create unique index participants_name_unique on participants (lower(name));

create table checkpoint_progress (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references participants (device_id) on delete cascade,
  checkpoint_id text not null,
  via_manual boolean not null default false,
  unlocked_at timestamptz not null default now(),
  unique (device_id, checkpoint_id)
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  checkpoint_id text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Realtime
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table checkpoint_progress;

-- Deliver the full row (not just the primary key) on UPDATE/DELETE realtime
-- events. Clients patch their local snapshot from the payload instead of
-- re-fetching the whole table, so a DELETE must carry device_id to know which
-- walker to remove. Cheap here (tiny rows) and required by the incremental sync.
alter table participants replica identity full;
alter table checkpoint_progress replica identity full;

-- Open RLS (event-only; revisit before public use)
alter table participants enable row level security;
alter table checkpoint_progress enable row level security;
alter table photos enable row level security;

create policy "public participants" on participants for all using (true) with check (true);
create policy "public checkpoints" on checkpoint_progress for all using (true) with check (true);
create policy "public photos" on photos for all using (true) with check (true);

-- Storage bucket for the quarry group photos (create in dashboard or here):
-- insert into storage.buckets (id, name, public) values ('photos','photos', true);
