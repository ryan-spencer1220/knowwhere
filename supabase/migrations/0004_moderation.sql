-- ===========================================================================
-- 0004_moderation.sql — user-generated-content safety (App Store Guideline 1.2)
-- Adds report + block primitives. Reports are write-only for normal users
-- (reviewed via the dashboard / service role); blocks are managed by their owner.
-- ===========================================================================

-- Reports of objectionable content / users.
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('list', 'user', 'place')),
  target_id   uuid not null,
  reason      text not null,
  details     text,
  status      text not null default 'open',
  created_at  timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- One user blocking another.
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocker_idx on public.blocks (blocker_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.reports enable row level security;
alter table public.blocks  enable row level security;

-- reports: a user may file their own report; nobody can read them back
-- (handled out of band via the service role / Supabase dashboard).
create policy "users can file their own reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- blocks: you can see and manage only the blocks you created.
create policy "users can see their own blocks"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "users can create their own blocks"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "users can remove their own blocks"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());
