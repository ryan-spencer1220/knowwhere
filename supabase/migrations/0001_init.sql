-- SashasList initial schema
-- Domain: users (profiles) -> lists -> places, plus social (follows, saves).
--
-- Apply with the Supabase CLI (`supabase db push`) or paste into the
-- SQL editor in the Supabase dashboard.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, auto-created via trigger below.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique,
  display_name text,
  bio          text,
  city         text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Public user profiles, keyed to auth.users.';

-- ---------------------------------------------------------------------------
-- lists: a collection of places curated by one owner.
-- ---------------------------------------------------------------------------
create table public.lists (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  title           text not null,
  description     text,
  city            text,
  location        text,
  cover_image_url text,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index lists_owner_id_idx on public.lists (owner_id);
create index lists_public_created_idx on public.lists (created_at desc) where is_public;

-- ---------------------------------------------------------------------------
-- list_places: the locations inside a list (a snapshot of a Google Place).
-- ---------------------------------------------------------------------------
create table public.list_places (
  id              uuid primary key default gen_random_uuid(),
  list_id         uuid not null references public.lists (id) on delete cascade,
  google_place_id text,
  name            text not null,
  address         text,
  latitude        double precision,
  longitude       double precision,
  note            text,
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);

create index list_places_list_id_idx on public.list_places (list_id, position);

-- ---------------------------------------------------------------------------
-- follows: directed "X follows Y" edges (powers the friend feed).
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

-- ---------------------------------------------------------------------------
-- list_saves: a user bookmarking someone's list (powers Explore/trending).
-- ---------------------------------------------------------------------------
create table public.list_saves (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  list_id    uuid not null references public.lists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, list_id)
);

create index list_saves_list_id_idx on public.list_saves (list_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'username'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Convenience view: lists with their place + save counts.
-- ---------------------------------------------------------------------------
create view public.lists_with_counts
with (security_invoker = true)
as
  select
    l.*,
    coalesce(p.places_count, 0) as places_count,
    coalesce(s.saves_count, 0)  as saves_count
  from public.lists l
  left join (
    select list_id, count(*) as places_count
    from public.list_places group by list_id
  ) p on p.list_id = l.id
  left join (
    select list_id, count(*) as saves_count
    from public.list_saves group by list_id
  ) s on s.list_id = l.id;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles    enable row level security;
alter table public.lists       enable row level security;
alter table public.list_places enable row level security;
alter table public.follows     enable row level security;
alter table public.list_saves  enable row level security;

-- profiles: readable by anyone signed in; you can only write your own row.
create policy "profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- lists: public lists are visible to everyone; private lists only to owner.
create policy "public lists are viewable, private only by owner"
  on public.lists for select
  to authenticated
  using (is_public or owner_id = auth.uid());

create policy "users can create their own lists"
  on public.lists for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "users can update their own lists"
  on public.lists for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "users can delete their own lists"
  on public.lists for delete
  to authenticated
  using (owner_id = auth.uid());

-- list_places: visible when the parent list is visible; writable by list owner.
create policy "list places follow parent list visibility"
  on public.list_places for select
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id
        and (l.is_public or l.owner_id = auth.uid())
    )
  );

create policy "owners can modify places in their lists"
  on public.list_places for all
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_id and l.owner_id = auth.uid()
    )
  );

-- follows: anyone signed in can read; you manage only edges you originate.
create policy "follows are viewable by authenticated users"
  on public.follows for select
  to authenticated
  using (true);

create policy "users can follow as themselves"
  on public.follows for insert
  to authenticated
  with check (follower_id = auth.uid());

create policy "users can unfollow as themselves"
  on public.follows for delete
  to authenticated
  using (follower_id = auth.uid());

-- list_saves: a user reads/manages only their own saves.
create policy "users can read their own saves"
  on public.list_saves for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can save as themselves"
  on public.list_saves for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can unsave as themselves"
  on public.list_saves for delete
  to authenticated
  using (user_id = auth.uid());
